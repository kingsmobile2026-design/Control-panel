const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// JSON 데이터 파싱 및 정적 파일(HTML) 경로 설정
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 디스코드 봇 설정
// ==========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', () => {
    console.log(`🔥 근성봇 웹 연동 서버 가동 시작! (${client.user.tag})`);
});

// ==========================================
// 웹 패널에서 호출하는 API 엔드포인트
// ==========================================
app.post('/api/send', async (req, res) => {
    const { targetId, messageText, count } = req.body;

    if (!targetId || !messageText) {
        return res.status(400).json({ error: '유저 ID와 메시지가 누락되었습니다.' });
    }

    try {
        // 유저 객체 가져오기 (캐시에 없으면 fetch로 가져옴)
        const user = await client.users.fetch(targetId);
        if (!user) {
            return res.status(404).json({ error: '해당 유저를 찾을 수 없습니다.' });
        }

        const finalCount = count > 50 ? 50 : parseInt(count) || 5;

        // 비동기로 백그라운드에서 DM 폭격 실행 (0.5초 간격)
        (async () => {
            for (let i = 0; i < finalCount; i++) {
                try {
                    await user.send(`🔥 [근성 통보 ${i + 1}/${finalCount}] ${messageText}`);
                } catch (err) {
                    console.error(`DM 전송 실패: ${err.message}`);
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 딜레이
            }
        })();

        return res.json({ success: true, message: `${user.username}님에게 DM ${finalCount회} 전송 시작됨!` });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: '유저를 찾을 수 없거나 DM 권한이 없습니다.' });
    }
});

// 디스코드 로그인
const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
    console.error('❌ BOT_TOKEN이 설정되지 않았습니다.');
    process.exit(1);
}

client.login(TOKEN);

// Express 서버 실행
app.listen(PORT, () => {
    console.log(`🌐 웹 제어 패널 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
