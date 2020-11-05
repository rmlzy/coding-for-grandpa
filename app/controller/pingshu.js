"use strict";

const Controller = require("egg").Controller;

class PingshuController extends Controller {
  async fetch() {
    const { ctx, service } = this;
    ctx.runInBackground(async () => {
      await service.pingshu.generateJSON();
    });
    ctx.body = "OK";
  }
}

module.exports = PingshuController;
