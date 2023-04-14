import { getRates } from '../api';
import { minute } from './constants';
import { TypeCurrency, Rates } from '../utils/types';
import { User } from '../entity/user';
import { state } from './botState';
import { getCurrenciesOptions } from './keyboard';

export const syncRate = () => {
  let lastUpdateTime = 0;
  let rates: Rates;

  return async () => {
    const currentTime = Date.now();
    const shouldUpdate = currentTime - lastUpdateTime >= minute * 10;
    if (shouldUpdate) {
      rates = await getRates();
      lastUpdateTime = currentTime;
    }

    const formattedLastUpdateTime = new Date(lastUpdateTime).toLocaleString();

    return { rates, date: formattedLastUpdateTime };
  };
};

export const getRate = syncRate();

export const convertRatesToString = (data: Rates, date: string) => {
  const formattedRates = Object.entries(data)
    .map(([currency, rate]) => `${currency} - ${rate}`)
    .join('\n');

  return `${date}\n\n${formattedRates || 'we are fetching the data'}`;
};

export const getUserRates = (rates: Rates, user: User | null) => {
  if (!user) return rates;
  return user.currencies.reduce<Rates>((acc, item) => {
    const name = item.name as TypeCurrency;
    return { ...acc, ...(!!rates[name] && { [name]: rates[name] }) };
  }, {} as Rates);
};

export const getHiddenMessage = (message: string) => {
  const encodeMessage = Buffer.from(new Date().toISOString()).toString('base64');
  return `<a href="tg://btn/${encodeMessage}">\u200b</a>${message}`;
};

export const getCurData = async (user: User) => {
  const userCurrenciesText = user.currencies.map(({ name }) => name).join(', ');
  const allСurrencies = await state.getCurrencies();
  const filteredСurrencies = allСurrencies.filter(
    ({ name }) => name !== user.defaultCurrency?.name
  );
  const filteredСurrenciesText = filteredСurrencies.map(({ name }) => name).join(', ');
  const allСurrenciesWithExtraInfo = allСurrencies
    .filter(({ name }) => name !== user.defaultCurrency?.name)
    .map((currency) => ({
      ...currency,
      isActive: !!user.currencies.find((userCurrency) => userCurrency.id === currency.id),
    }));

  const currenciesOptions = getCurrenciesOptions(allСurrenciesWithExtraInfo);
  const message = `Здесь вы можете настроить валюты\nВаши валюты: ${userCurrenciesText}\nВсе валюты: ${filteredСurrenciesText}`;
  return { message, options: currenciesOptions };
};

export const isTimeZoneOffsetCorrect = (timeZoneOffset: string) => {
  // TODO: Сделать ввлидацию
  return timeZoneOffset === '+03:00';
};
