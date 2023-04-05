import TelegramBot, {
  Message,
  CallbackQuery,
  SendMessageOptions,
  EditMessageTextOptions,
} from 'node-telegram-bot-api';
import { CALL_BACK_DATA } from './constants';
import { convertRatesToString, getUserRates } from './utils';
import { scheduler } from '../utils/scheduler';
import { ADMIN_ID } from '../utils/config';
import { logger } from '../utils/logger';
import { userService } from '../services/UserService';
import { User } from '../entity/user';
import { defaultOptions, settingsKeyboardOptions } from './keyboard';
import { BotError } from './error';
import { state } from './botState';

type Mapping = Record<
  CALL_BACK_DATA,
  (user: User | null) => Promise<{ message: string; options: EditMessageTextOptions }>
>;

const mapping: Mapping = {
  GET_RATES: async (user) => {
    const { rates, date } = (await scheduler).getInfo();
    const userRates = getUserRates(rates, user);
    const message = convertRatesToString(userRates, date);
    const options = defaultOptions;
    return { message, options };
  },
  TEST: async () => {
    const message = 'This is the test!!!';
    return { message, options: defaultOptions };
  },
  SETTINGS: async () => {
    const message = 'settings';
    return { message, options: settingsKeyboardOptions };
  },
  CURRENCIES: async () => {
    const message = 'CURRENCIES';
    return { message, options: settingsKeyboardOptions };
  },
  REMINDER: async () => {
    const message = 'REMINDER';
    return { message, options: settingsKeyboardOptions };
  },
  TIME_ZONE: async () => {
    const message = 'TIME_ZONE';
    return { message, options: settingsKeyboardOptions };
  },
};

const onCallbackQuery = async (query: CallbackQuery, bot: TelegramBot) => {
  if (!query.message) {
    throw new BotError('The re is no message!!!!!');
  }
  const {
    message_id,
    chat: { id: chat_id },
  } = query.message;

  const data = query.data as CALL_BACK_DATA;
  const id = query.from.id;
  const user = await userService.getUser(id);
  const { message, options } = await mapping[data](user);

  state.setState(id, data);

  logger.addUserRequestLog({
    username: query.from.username,
    action: `onCallbackQuery - ${data}`,
  });

  bot.editMessageText(message, {
    chat_id,
    message_id,
    ...options,
  });
};

const onStart = async (message: Message, bot: TelegramBot) => {
  const chatId = message.chat.id;
  const username = message.chat.username || 'username';
  const id = message.chat.id;
  const user = await userService.getUser(id);
  if (!user) await userService.addUser(id, username);

  bot.sendMessage(chatId, `Hi, ${username}`, defaultOptions);
};

const onGetRates = async (message: Message, bot: TelegramBot) => {
  const id = message.chat.id;
  const user = await userService.getUser(id);
  if (!user?.currencies) {
    bot.sendMessage(id, 'There is currencies. Please, update your settings', defaultOptions);
  }
  const { rates, date } = (await scheduler).getInfo();
  const userRates = getUserRates(rates, user);
  logger.addUserRequestLog({ username: message.chat.username, action: 'onGetRates' });
  bot.sendMessage(id, convertRatesToString(userRates, date), defaultOptions);
};

const onGetLogs = async (message: Message, bot: TelegramBot) => {
  const chatId = message.chat.id;
  logger.addUserRequestLog({ username: message.chat.username, action: 'onGetLogs' });
  const logs = logger.getLogs();
  const id = message.from?.id;
  const messageText = id == ADMIN_ID ? logs : 'No!!!';
  bot.sendMessage(chatId, messageText, defaultOptions);
};

const onMessage = async (message: Message, bot: TelegramBot) => {
  console.log('message: ', message);
};

export const services = { onCallbackQuery, onStart, onGetRates, onGetLogs, onMessage };
