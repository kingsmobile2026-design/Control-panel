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

// 🤐 여물기 당한 유저들을 관리하는 Set (유저 ID 저장)
const mutedUsers = new Set();

// 🔑 인증된 사용자 관리용 Set (관리자 ID는 기본 포함)
const ADMIN_ID = '1510598626718781500';
const authorizedUsers = new Set([ADMIN_ID]);

client.once('ready', () => {
    console.log(`🔥 근성봇 가동 시작! (${client.user.tag})`);
    client.user.setActivity('!명령어 입력', { type: 0 });
});

client.on('messageCreate', async (message) => {
    // 🤐 [여물기 감지 시스템] 봇이 아닌 일반 유저가 보낸 메시지 중 여물기 대상이 있다면 즉시 삭제
    if (!message.author.bot && mutedUsers.has(message.author.id)) {
        try {
            await message.delete();
        } catch (e) {}
        return;
    }

    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 📌 유효한 명령어 리스트 정의
    const validCommands = ['명령어', '사용자id', '근성', '서버근성', '중지', '인증', '인증해제', '강제중지', '여물기', '메세지삭제'];

    // 0️⃣ 등록되지 않은 명령어를 입력했을 때
    if (!validCommands.includes(command)) {
        return message.reply("제대로된 명령어 입력해주세요");
    }

    // 🔑 권한 체크
    const isManager = (message.author.id === ADMIN_ID);
    const isAuthorized = authorizedUsers.has(message.author.id);

    const openCommands = ['명령어', '사용자id'];
    if (!openCommands.includes(command) && !isAuthorized) {
        return message.reply("관리자에게 권한요청 하세요 스레기야");
    }

    // 1️⃣ !명령어 패널
    if (command === '명령어') {
        return message.channel.send(
            "**[근성봇 명령어 패널]**\n\n" +
            "**1. 사용자 ID 확인**\n" +
            "`!사용자id @유저멘션`\n\n" +
            "**2. DM 근성 폭격**\n" +
            "`!근성 [유저ID] [횟수] [보낼메세지]`\n\n" +
            "**3. 서버 채널 근성 폭격**\n" +
            "`!서버근성 [횟수] [보낼메세지]`\n\n" +
            "**4. 여물기**\n" +
            "`!여물기 @유저멘션` : 해당 유저가 치는 모든 채팅을 실시간 자동 삭제합니다.\n\n" +
            "**5. 특정 유저 메시지 최신순 골라 삭제 (현재 채널 전용)**\n" +
            "`!메세지삭제 @유저멘션 [삭제할갯수]` : 이 채널에서 타겟 유저가 쓴 메시지를 **가장 최신순**으로 지정한 수만큼 삭제합니다.\n\n" +
            "**6. 중지하기**\n" +
            "`!중지` : 본인의 폭격 작업 및 여물기 상태를 전부 해제합니다.\n\n" +
            "**7. 관리자 전용 명령어**\n" +
            "`!인증 @사용자이름` : 봇 사용 권한 부여\n" +
            "`!인증해제 @사용자이름` : 봇 사용 권한 박탈\n" +
            "`!강제중지` : 모든 폭격 정지 및 모든 유저 여물기 해제"
        );
    }

    // 2️⃣ !인증 @사용자이름 (관리자 전용)
    if (command === '인증') {
        if (!isManager) {
            return message.reply("관리자에게 권한요청 하세요 스레기야");
        }

        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply("⚠️ 권한을 부여할 유저를 멘션해주세요! 예: `!인증 @홍길동`");
        }

        authorizedUsers.add(targetUser.id);
        return message.channel.send(`✅ <@${targetUser.id}>님이 봇 사용 권한을 승인받았습니다!`);
    }

    // 3️⃣ !인증해제 @사용자이름 (관리자 전용)
    if (command === '인증해제') {
        if (!isManager) {
            return message.reply("관리자에게 권한요청 하세요 스레기야");
        }

        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply("⚠️ 권한을 해제할 유저를 멘션해주세요! 예: `!인증해제 @홍길동`");
        }

        if (targetUser.id === ADMIN_ID) {
            return message.reply("관리자의 인증은 해제할 수 없습니다.");
        }

        authorizedUsers.delete(targetUser.id);
        return message.channel.send(`🚫 <@${targetUser.id}>님의 봇 사용 권한이 박탈되었습니다.`);
    }

    // 4️⃣ !메세지삭제 @유저멘션 [삭제할갯수] (현재 채널에서만, 가장 최신순)
    if (command === '메세지삭제') {
        const targetUser = message.mentions.users.first();
        const deleteCount = parseInt(args[1]);

        if (!targetUser || isNaN(deleteCount) || deleteCount <= 0) {
            return message.reply("⚠️ 형식이 잘못되었습니다! 예시: `!메세지삭제 @홍길동 10`");
        }

        const maxDelete = deleteCount > 100 ? 100 : deleteCount;
        await message.reply(`🧹 현재 채널에서 <@${targetUser.id}>님의 메시지를 가장 최신순으로 최대 ${maxDelete}개 탐색 및 삭제 중입니다...`);

        try {
            // 명령어를 입력한 현재 채널의 최근 메시지 100개 가져오기
            const fetchedMessages = await message.channel.messages.fetch({ limit: 100 });
            
            // 타겟 유저가 현재 채널에 쓴 메시지만 필터링 (최신순 정렬 유지)
            const targetMessages = fetchedMessages.filter(msg => msg.author.id === targetUser.id);

            let deletedSoFar = 0;
            // 위에서부터(가장 최신순) 순서대로 삭제 진행
            for (const msg of targetMessages.values()) {
                if (deletedSoFar >= maxDelete) break;
                try {
                    await msg.delete();
                    deletedSoFar++;
                    // API 제한 방지 딜레이
                    await new Promise(resolve => setTimeout(resolve, 200));
                } catch (err) {
                    // 이미 삭제되었거나 권한 부족 시 패스
                }
            }

            await message.channel.send(`✅ 현재 채널에서 <@${targetUser.id}>님의 메시지 총 ${deletedSoFar}개가 가장 최신순으로 삭제되었습니다.`);
        } catch (error) {
            await message.channel.send(`❌ 메시지 삭제 중 오류 발생: ${error.message}`);
        }
        return;
    }

    // 5️⃣ !여물기 @유저멘션
    if (command === '여물기') {
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply("⚠️ 여물게 할 유저를 멘션해주세요! 예: `!여물기 @홍길동`");
        }

        if (targetUser.id === ADMIN_ID) {
            return message.reply("관리자라서 안돼요 이 버러지야");
        }

        mutedUsers.add(targetUser.id);
        return message.channel.send(`🤐 <@${targetUser.id}>님에게 여물기가 적용되었습니다. 앞으로 치는 모든 채팅이 즉시 삭제됩니다.`);
    }

    // 6️⃣ !강제중지 (관리자 전용)
    if (command === '강제중지') {
        if (!isManager) {
            return message.reply("관리자에게 권한요청 하세요 스레기야");
        }

        activeTasks.clear();
        mutedUsers.clear();
        return message.channel.send("🛑 **[관리자 권한]** 모든 폭격 작업이 중지되었고, 모든 유저의 여물기가 해제되었습니다!");
    }

    // 7️⃣ !사용자id @유저
    if (command === '사용자id') {
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply("⚠️ ID를 확인할 유저를 멘션해주세요! 예: `!사용자id @홍길동`");
        }

        try {
            await message.author.send(
                `요청하신 **${targetUser.username}**님의 고유 ID입니다:\n` +
                `\`${targetUser.id}\`\n` +
                `(이 숫자를 복사해서 \`!근성\` 명령어에 사용하세요!)`
            );
            await message.reply("해당 유저의 고유 ID를 회원님의 DM으로 전송했습니다! 확인해주세요.");
        } catch (error) {
            await message.reply("회원님의 DM이 차단되어 있어 ID를 보낼 수 없습니다. DM을 열어주세요!");
        }
        return;
    }

    // 8️⃣ !근성 [유저ID] [횟수] [메시지]
    if (command === '근성') {
        const targetId = args[0];
        const count = parseInt(args[1]);
        const messageText = args.slice(2).join(' ');

        if (!targetId || isNaN(count)) {
            return message.reply("형식이 잘못되었습니다! 예시: `!근성 123456789012345678 50 파이팅!`");
        }

        if (!isManager && targetId === ADMIN_ID) {
            return message.reply("관리자라서 안돼요 이 버러지야");
        }

        const taskKey = message.author.id;
        if (activeTasks.get(taskKey)) {
            return message.reply("이미 진행 중인 작업이 있습니다. 중지하려면 `!중지`를 입력하세요.");
        }

        const finalCount = count > 100 ? 100 : count;
        const attachment = message.attachments.first();
        const fileUrl = attachment ? attachment.url : null;

        activeTasks.set(taskKey, true);
        await message.channel.send(`<@${targetId}>님에게 DM 근성 폭격 시작! (총 ${finalCount}회, 0.3초 간격${fileUrl ? ', 미디어 포함' : ''})`);

        let successCount = 0;

        try {
            const user = await client.users.fetch(targetId);
            if (!user) {
                await message.channel.send("해당 유저를 찾을 수 없습니다.");
                activeTasks.delete(taskKey);
                return;
            }

            for (let i = 0; i < finalCount; i++) {
                if (!activeTasks.has(taskKey) || !activeTasks.get(taskKey)) {
                    break;
                }

                const randomId = Math.floor(Math.random() * 9000) + 1000;
                const bodyText = messageText ? messageText : "근성 발동!";
                const formattedMessage = `\`\`\`text\n[근성 통보 ${i + 1}/${finalCount}] ${bodyText} #${randomId}\n\`\`\``;

                const sendOptions = { content: formattedMessage };
                if (fileUrl) sendOptions.files = [fileUrl];

                try {
                    await user.send(sendOptions);
                    successCount++;
                } catch (sendErr) {
                    console.log(`전송 에러 무시하고 진행: ${sendErr.message}`);
                }

                if (i < finalCount - 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }

            if (successCount > 0 && activeTasks.has(taskKey)) {
                await message.channel.send(`<@${targetId}>님에게 DM ${successCount}/${finalCount}회 전송 완료!`);
            }
        } catch (error) {
            await message.channel.send(`전송 중 에러 발생: ${error.message}`);
        }

        activeTasks.delete(taskKey);
        return;
    }

    // 9️⃣ !서버근성 [횟수] [메시지]
    if (command === '서버근성') {
        const count = parseInt(args[0]);
        const messageText = args.slice(1).join(' ');

        if (isNaN(count) || !messageText) {
            return message.reply("형식이 잘못되었습니다! 예시: `!서버근성 30 꺾이지 않는 마음!`");
        }

        const taskKey = message.author.id;
        if (activeTasks.get(taskKey)) {
            return message.reply("이미 진행 중인 작업이 있습니다. 중지하려면 `!중지`를 입력하세요.");
        }

        const finalCount = count > 100 ? 100 : count;
        const attachment = message.attachments.first();
        const fileUrl = attachment ? attachment.url : null;

        try { await message.delete(); } catch (e) {}

        activeTasks.set(taskKey, true);
        let successCount = 0;

        for (let i = 0; i < finalCount; i++) {
            if (!activeTasks.has(taskKey) || !activeTasks.get(taskKey)) {
                break;
            }

            const randomId = Math.floor(Math.random() * 9000) + 1000;
            const formattedMessage = `\`\`\`text\n[서버 근성 ${i + 1}/${finalCount}] ${messageText} #${randomId}\n\`\`\``;

            const sendOptions = { content: formattedMessage };
            if (fileUrl) sendOptions.files = [fileUrl];

            try {
                await message.channel.send(sendOptions);
                successCount++;
            } catch (sendErr) {
                console.log(`서버 채널 전송 에러 무시하고 진행: ${sendErr.message}`);
            }

            if (i < finalCount - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        if (successCount > 0 && activeTasks.has(taskKey)) {
            await message.channel.send(`**[서버 근성 완료]** 총 ${successCount}회 전송 완료!`);
        }

        activeTasks.delete(taskKey);
        return;
    }

    // 🔟 !중지
    if (command === '중지') {
        const userId = message.author.id;
        let actionTaken = false;

        if (activeTasks.has(userId)) {
            activeTasks.delete(userId);
            actionTaken = true;
        }

        if (mutedUsers.has(userId)) {
            mutedUsers.delete(userId);
            actionTaken = true;
        }

        if (actionTaken) {
            return message.reply("진행 중인 본인의 작업 및 여물기 상태가 해제되었습니다.");
        } else {
            return message.reply("현재 실행 중인 본인의 작업이나 적용된 상태가 없습니다.");
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
