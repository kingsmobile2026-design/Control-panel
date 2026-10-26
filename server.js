const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 디스코드 봇 설정
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', () => {
    console.log(`근성봇 시작 (${client.user.tag})`);
});

// 웹 패널 API 엔드포인트 (동기 완료 대기형)
app.post('/api/send', async (req, res) => {
    const { targetId, messageText, count } = req.body;

    if (!targetId || !messageText) {
        return res.status(400).json({ error: '유저 ID와 메시지가 누락되었습니다.' });
    }

    try {
        const user = await client.users.fetch(targetId);
        if (!user) {
            return res.status(404).json({ error: '해당 유저를 찾을 수 없습니다.' });
        }

        const finalCount = count > 50 ? 50 : parseInt(count) || 5;
        let successCount = 0;

        // 전송이 완전히 끝날 때까지 서버가 대기
        for (let i = 0; i < finalCount; i++) {
            await user.send(` 근성 ${i + 1}/${finalCount}] ${messageText}`);
            successCount++;
            
            // 초당 2번 (0.5초 딜레이)
            if (i < finalCount - 1) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }

        return res.json({ success: true, message: `${user.username}님에게 DM ${successCount}회 전송 완료!` });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: '전송 중 오류 발생: ' + error.message });
    }
});

// 디스코드 로그인
const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
    console.error('❌ BOT_TOKEN이 설정되지 않았습니다.');
    process.exit(1);
}

client.login(TOKEN);

app.listen(PORT, () => {
    console.log(`🌐 웹 제어 패널 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
