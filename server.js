const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// Render 헬스 체크용 최소한의 웹 서버 (유지용)
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
    res.send('🔥 디스코드 근성봇이 정상 가동 중입니다!');
});
app.listen(PORT, () => {
    console.log(`🌐 Express 서버가 포트 ${PORT}에서 실행 중입니다.`);
});

// 디스코드 봇 설정
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// 진행 중인 작업 관리 (유저 ID별)
const activeTasks = new Map();

client.once('ready', () => {
    console.log(`🔥 근성봇 가동 시작! (${client.user.tag})`);
    client.user.setActivity('!명령어 입력', { type: 0 });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 1️⃣ !명령어 패널
    if (command === '명령어') {
        return message.channel.send(
            "🔥 **[근성봇 명령어 패널]**\n\n" +
            "📌 **1. 사용자 ID 확인**\n" +
            "`!사용자id @유저멘션`\n" +
            "👉 해당 유저의 고유 ID를 **본인의 DM으로 안전하게** 보내드립니다.\n\n" +
            "📌 **2. DM 근성 폭격 (0.3초 간격 + 코드블록 + 랜덤 고유번호)**\n" +
            "`!근성 [유저ID] [횟수] [보낼메세지]`\n" +
            "예시: `!근성 123456789012345678 10 정신 차려라!`\n\n" +
            "📌 **3. 중지하기**\n" +
            "`!중지` : 진행 중인 DM 폭격을 즉시 멈춥니다."
        );
    }

    // 2️⃣ !사용자id @유저 -> 명령어 쓴 사람의 DM으로 고유 ID 전송
    if (command === '사용자id') {
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply("⚠️ ID를 확인할 유저를 멘션해주세요! 예: `!사용자id @홍길동`");
        }

        try {
            await message.author.send(
                `🔍 요청하신 **${targetUser.username}**님의 고유 ID입니다:\n` +
                `\`${targetUser.id}\`\n` +
                `(이 숫자를 복사해서 \`!근성\` 명령어에 사용하세요!)`
            );
            await message.reply("✅ 해당 유저의 고유 ID를 **회원님의 DM으로 전송**했습니다! 확인해주세요.");
        } catch (error) {
            await message.reply("❌ 회원님의 DM이 차단되어 있어 ID를 보낼 수 없습니다. DM을 열어주세요!");
        }
        return;
    }

    // 3️⃣ !근성 [유저ID] [횟수] [메시지] (0.3초 초고속 + 코드블록 + 랜덤 고유번호)
    if (command === '근성') {
        const targetId = args[0];
        const count = parseInt(args[1]);
        const messageText = args.slice(2).join(' ');

        if (!targetId || isNaN(count) || !messageText) {
            return message.reply("⚠️ 형식이 잘못되었습니다! 예시: `!근성 123456789012345678 10 파이팅!`");
        }

        const taskKey = message.author.id;
        if (activeTasks.get(taskKey)) {
            return message.reply("⚠️ 이미 진행 중인 작업이 있습니다. 중지하려면 `!중지`를 입력하세요.");
        }

        const finalCount = count > 50 ? 50 : count;
        if (count > 50) {
            message.channel.send("⚠️ 제재 방지를 위해 1회 최대 50회까지만 적용됩니다!");
        }

        activeTasks.set(taskKey, true);
        await message.channel.send(`🔥 <@${targetId}>님에게 DM 근성 폭격 시작! (총 ${finalCount}회, 0.3초 간격)`);

        let successCount = 0;

        try {
            const user = await client.users.fetch(targetId);
            if (!user) {
                await message.channel.send("❌ 해당 유저를 찾을 수 없습니다.");
                activeTasks.set(taskKey, false);
                return;
            }

            for (let i = 0; i < finalCount; i++) {
                if (!activeTasks.get(taskKey)) {
                    await message.channel.send("🛑 **DM 폭격이 중지되었습니다.**");
                    break;
                }

                // 💡 1000~9999 사이의 랜덤 고유 번호 생성
                const randomId = Math.floor(Math.random() * 9000) + 1000;

                // 💡 무조건 코드 블록(```)으로 감싸고 끝에 랜덤 고유 번호 부착
                const formattedMessage = `\`\`\`text\n[근성 통보 ${i + 1}/${finalCount}] ${messageText} #${randomId}\n\`\`\``;

                await user.send(formattedMessage);
                successCount++;

                if (i < finalCount - 1) {
                    await new Promise(resolve => setTimeout(resolve, 300)); // 0.3초 딜레이
                }
            }

            if (successCount > 0) {
                await message.channel.send(`✅ <@${targetId}>님에게 DM ${successCount}회 전송 완료!`);
            }
        } catch (error) {
            await message.channel.send(`❌ 전송 중 에러 발생: ${error.message}`);
        }

        activeTasks.set(taskKey, false);
        return;
    }

    // 4️⃣ !중지
    if (command === '중지') {
        const taskKey = message.author.id;
        if (activeTasks.get(taskKey)) {
            activeTasks.set(taskKey, false);
            return message.reply("🛑 진행 중인 DM 작업을 중지합니다.");
        } else {
            return message.reply("❓ 현재 실행 중인 본인의 작업이 없습니다.");
        }
    }
});

// 봇 로그인
const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
    console.error('❌ BOT_TOKEN이 설정되지 않았습니다.');
    process.exit(1);
}

client.login(TOKEN);
