import TelegramBot, { Message, CallbackQuery } from 'node-telegram-bot-api';
import { CALL_BACK_DATA, commandsList } from '../constants';

// import { logger } from '../../utils/logger';
import { userService } from '../../services/UserService';
import { User } from '../../entity/user';
import { BotError } from '../error';
import { state } from '../botState';
import * as queryCotrollers from './callbackQueryControllers';
import { onUpdateTimeZoneOffset } from './messageControllers';

type Mapping = Record<
  CALL_BACK_DATA,
  (bot: TelegramBot, chat_id: number, message_id: number, user: User) => Promise<void>
>;

const mapping: Mapping = {
  [CALL_BACK_DATA.GET_RATES]: queryCotrollers.onGetRatesCallbackQuery,
  [CALL_BACK_DATA.TEST]: queryCotrollers.onTestCallbackQuery,
  [CALL_BACK_DATA.SETTINGS]: queryCotrollers.onSettingsCallbackQuery,
  [CALL_BACK_DATA.SET_CUR]: queryCotrollers.onSetCurrenciesCallbackQuery,
  [CALL_BACK_DATA.SET_RR]: queryCotrollers.onReminderCallbackQuery,
  [CALL_BACK_DATA.SET_TZ]: queryCotrollers.onSetTimeZoneOffsetCallbackQuery,
};

const onCallbackQuery = async (query: CallbackQuery, bot: TelegramBot) => {
  if (!query.message) throw new BotError('There is no message!!!!!');

  const {
    message_id,
    chat: { id: chat_id },
  } = query.message;

  const data = query.data as CALL_BACK_DATA;
  const id = query.from.id;
  const username = query.from.username || 'username';
  const user = await userService.forceAddUser(id, username);

  if (!user) throw new BotError('Something went wrong');

  // logger.addUserRequestLog({
  //   username: query.from.username,
  //   action: `onCallbackQuery - ${data}`,
  // });

  state.setState(id, { user, mode: data });

  const currencies = await state.getCurrencies();

  const isCurrencyRequest = !!currencies.find((item) => item.name === data);

  if (isCurrencyRequest) {
    return await queryCotrollers.onSelectCurrenciesCallbackQuery(
      bot,
      data as string,
      user,
      chat_id,
      message_id
    );
  }

  const action = mapping[data];
  await action(bot, chat_id, message_id, user);
};

const onMessage = async (message: Message, bot: TelegramBot) => {
  const id = message.chat.id;
  const user = state.getState(id);

  const isMessageFromCommandList = commandsList.find(({ command }) => command === message.text);
  if (isMessageFromCommandList) return;

  if (!user) return bot.sendMessage(id, 'I do not know what you want!!!!');

  if (user.mode === CALL_BACK_DATA.SET_TZ) {
    return onUpdateTimeZoneOffset(bot, user, message);
  }
  bot.sendMessage(id, 'asdfsadfdfd');
};

export const controllers = { onCallbackQuery, onMessage };
