const Service = require("egg").Service;
const cheerio = require("cheerio");
const iconv = require("iconv-lite");
const fs = require("fs-extra");
const path = require("path");

class PingshuService extends Service {
  async generateJSON() {
    const { app } = this;
    // 获取所有专辑的链接
    const books = await this.fetchAllBookUrls();
    let res = [];
    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      // 获取专辑下所有的章节链接
      book.chapters = await this.fetchChapters(book);
      res.push(book);
    }

    const outputDir = path.join(app.baseDir, "data");
    try {
      await fs.ensureDir(outputDir);
      await fs.writeJson(`${outputDir}/shantianfang.json`);
    } catch (e) {
      // ignore
    }
  }

  async fetchAllBookUrls() {
    const pageUrls = [
      "http://shantianfang.zgpingshu.com/index.html",
      "http://shantianfang.zgpingshu.com/index_2.html",
      "http://shantianfang.zgpingshu.com/index_3.html",
      "http://shantianfang.zgpingshu.com/index_3.html",
      "http://shantianfang.zgpingshu.com/index_4.html",
      "http://shantianfang.zgpingshu.com/index_5.html",
      "http://shantianfang.zgpingshu.com/index_6.html",
      "http://shantianfang.zgpingshu.com/index_7.html",
      "http://shantianfang.zgpingshu.com/index_8.html",
    ];
    const bookUrls = [];
    for (let i = 0; i < pageUrls.length; i++) {
      const pageUrl = pageUrls[i];
      const urls = await this.fetchBookUrls(pageUrl);
      bookUrls.push(...urls);
    }
    return bookUrls;
  }

  async fetchBookUrls(pageUrl) {
    const { ctx } = this;
    console.log(`抓取专辑: ${pageUrl}`);
    const urls = [];
    try {
      const res = await ctx.curl(pageUrl, { type: "GET", dataType: "html" });
      const decoded = iconv.decode(res.data, "GBK");
      const $ = cheerio.load(decoded);
      $("#categoryHeader .lists2 li .title a").each(function (i, div) {
        const name = $(this).text();
        const url = $(this).attr("href");
        urls.push({ name, url: `http:${url}`, chapters: [] });
      });
    } catch (e) {
      // ignore
    }
    return urls;
  }

  async fetchChapters(book) {
    const { ctx } = this;
    console.log(`抓取章节: ${book.name}`);
    const chapters = [];
    try {
      const res = await ctx.curl(book.url, { type: "GET", dataType: "html" });
      const decoded = iconv.decode(res.data, "GBK");
      const $ = cheerio.load(decoded);
      $(".play-area .play-btns li").each(function (i, div) {
        const name = $(this).find(".player a").text();
        const url = $(this).find(".down a").attr("href");
        chapters.push({
          name: `${name} - ${book.name}`,
          url: `http:${url}`,
        });
      });
    } catch (e) {
      // ignore
    }

    // 抓取下载链接
    const res = [];
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      chapter.downloadUrl = await this.fetchDownloadUrl(chapter);
      res.push(chapter);
    }
    return res;
  }

  async fetchDownloadUrl(chapter) {
    const { ctx } = this;
    console.log(`抓取下载地址: ${chapter.name}`);
    let url = "";
    try {
      const res = await ctx.curl(chapter.url, { type: "GET", dataType: "html" });
      const decoded = iconv.decode(res.data, "GBK");
      const $ = cheerio.load(decoded);
      url = $("#categoryHeader a#down").attr("href");
    } catch (e) {
      // ignore
    }
    return url;
  }
}

module.exports = PingshuService;
