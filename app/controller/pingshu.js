"use strict";

const Controller = require("egg").Controller;

class PingshuController extends Controller {
  async fetch() {
    const { ctx, service } = this;
    ctx.runInBackground(async () => {
      // await service.pingshu.generateJSON();

      // const bookJson = "七杰小五义(68回版).json";
      // await service.pingshu.downloadBook(bookJson);

      await service.pingshu.downloadAllBook();
    });
    ctx.body = "OK";
  }
}

module.exports = PingshuController;
