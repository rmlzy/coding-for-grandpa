"use strict";

const Controller = require("egg").Controller;

class PingshuController extends Controller {
  async fetch() {
    const { ctx, service } = this;
    const { author } = ctx.params;
    ctx.runInBackground(async () => {
      await service.pingshu.fetch(author);
    });
    ctx.body = "OK";
  }

  async download() {
    const { ctx, service } = this;
    const { author } = ctx.params;
    ctx.runInBackground(async () => {
      await service.pingshu.download(author);
    });
    ctx.body = "OK";
  }
}

module.exports = PingshuController;
