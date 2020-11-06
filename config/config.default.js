/* eslint valid-jsdoc: "off" */

"use strict";

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = (appInfo) => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = (exports = {});

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + "_coding-for-grandpa";

  // add your middleware config here
  config.middleware = [];

  config.httpclient = {
    httpAgent: {
      timeout: 60000,
    },
  };

  return config;
};
