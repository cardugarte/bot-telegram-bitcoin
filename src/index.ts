import { Telegraf, Context } from "telegraf";
import axios from "axios";
import dotenv from "dotenv";
import { url } from "inspector";

// Configuración del bot
dotenv.config();

if (
  !process.env.TELEGRAM_BOT_TOKEN ||
  !process.env.LNBITS_API_KEY ||
  !process.env.LNBITS_URL ||
  !process.env.ADMIN_ID ||
  !process.env.LNBITS_URL_MAIN
) {
  throw new Error("const is not defined in the environment variables");
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const LNBITS_API_KEY = process.env.LNBITS_API_KEY;
const LNBITS_URL = process.env.LNBITS_URL;
const LNBITS_URL_MAIN = process.env.LNBITS_URL_MAIN;

// Inicializar el bot
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Comando /start
bot.start((ctx: Context) => {
  const user = ctx.from;
  ctx.reply(`Hola ${user?.first_name}, ¡bienvenido!`);
});

// Comando /createwallet
bot.command("createwallet", async (ctx: Context) => {
  const user = ctx.from;
  const adminId = process.env.ADMIN_ID;
  const user_name = user?.first_name;
  const walletName = `wallet_${user?.username || user_name}`;

  try {
    const response = await axios.post(
      `${LNBITS_URL}/users`,
      {
        user_name: walletName,
        admin_id: adminId,
        wallet_name: walletName,
        user_email: user?.username,
      },
      {
        headers: {
          "X-Api-Key": LNBITS_API_KEY,
          "Content-type": "application/json",
        },
      }
    );

    const walletId = response.data.id;
    //localStorage.setItem("walletId", walletId);
    console.log(response)
    ctx.reply(
      `${user_name}, tu wallet se ha creado con éxito: id: ${walletId} - nombre: ${walletName}`
    );
  } catch (error) {
    ctx.reply("Error al crear la wallet");
    console.error("Error creating wallet:", error);
  }
});

// Comando /send
bot.command("send", async (ctx: Context) => {
  const args = ctx.text?.split(" ").slice(1) || [];

  if (args.length < 2) {
    ctx.reply("Uso: /send <recipient_wallet_id> <amount>");
    return;
  }

  const recipientWalletId = args[0];
  const amount = parseInt(args[1], 10);

  if (isNaN(amount)) {
    ctx.reply("El monto debe ser un número entero");
    return;
  }

  try {
    const response = await axios.post(
      `${LNBITS_URL}/wallet/${recipientWalletId}/payinvoice`,
      {
        amount,
      },
      {
        headers: {
          "X-Api-Key": LNBITS_API_KEY,
        },
      }
    );

    ctx.reply("Sats enviados con éxito");
  } catch (error) {
    ctx.reply("Error al enviar sats");
    console.error("Error sending sats:", error);
  }
});

// Comando /balance
bot.command("balance", async (ctx: Context) => {
  const user = ctx.from;
  const user_name = user?.first_name;
  const walletName = `wallet_${user?.username || user_name}`;

  try {
    const users = await axios.get(
      `${LNBITS_URL}/users`,
      {
        headers: {
          "X-Api-Key": LNBITS_API_KEY,
        },
      }
    );

    users.data.forEach(async (element: any) => {
      if (element.name === walletName) {
        const userId = element.id;

        const inkey = await axios.get(
          `${LNBITS_URL}/users/${userId}`,
          {
            headers: {
              "X-Api-Key": LNBITS_API_KEY,
            },
          }
        );
        const inkeyCode = `${inkey.data.wallets[0].inkey}`
        const balance = await axios.get(
          `${LNBITS_URL_MAIN}/wallet`,
          {
            headers: {
              "X-Api-Key": inkeyCode,
            },
          }
        );
        ctx.reply(`${user_name}, tu saldo es de: ${balance.data.balance} sats`);
      }
  });
  } catch (error) {
    ctx.reply("Error al obtener el balance");
    console.error("Error getting balance:", error);
  }
});

// Iniciar el bot
bot
  .launch()
  .then(() => {
    console.log("Bot iniciado");
  })
  .catch((err) => {
    console.error("Error al iniciar el bot:", err);
  });
