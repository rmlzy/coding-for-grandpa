"use strict";

const Controller = require("egg").Controller;

class JiduController extends Controller {
  async fetch() {
    const { ctx, service } = this;
    ctx.runInBackground(async () => {
      await service.jidu.fetch();
    });
    ctx.body = "OK";
  }
}

module.exports = JiduController;
