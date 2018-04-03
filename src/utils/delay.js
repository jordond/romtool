const DEFAULT_TIMEOUT = 100;

const delay = (timeout = DEFAULT_TIMEOUT) =>
  new Promise(resolve => setTimeout(resolve, timeout));

const delayAction = async (action, timeout = DEFAULT_TIMEOUT) => {
  await delay(timeout);
  action != null && action();
};

module.exports = {
  delay,
  delayAction
};
