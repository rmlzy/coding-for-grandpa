"use strict";

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = (app) => {
  const { router, controller } = app;
  router.get("/pingshu/fetch/:author", controller.pingshu.fetch);
  router.get("/pingshu/download/:author", controller.pingshu.download);

  router.get("/jidu/fetch", controller.jidu.fetch);

  router.get("/crack/random", controller.crack.random);
  router.get("/crack/gen", controller.crack.gen);
};
