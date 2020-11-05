const Service = require("egg").Service;
const cheerio = require("cheerio");
const iconv = require("iconv-lite");
const fs = require("fs-extra");
const path = require("path");
const request = require("request-promise");

class PingshuService extends Service {
  async generateJSON() {
    const { app } = this;
    const outputDir = path.join(app.baseDir, "data");
    await fs.ensureDir(outputDir);

    // 获取所有专辑的链接
    const books = await this.fetchAllBookUrls();
    const promises = [];
    books.forEach((book) => {
      promises.push(this.fetchChapters(book));
    });
    await Promise.all(promises);
    console.log("DONE!");
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
    const { ctx, app } = this;
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
    book.chapters = res;

    const outputDir = path.join(app.baseDir, "data");
    await fs.ensureDir(`${outputDir}/shantianfang`);
    await fs.writeJson(`${outputDir}/shantianfang/${book.name}.json`, book);
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

  async downloadAllBook() {
    const { app } = this;
    const outputDir = path.join(app.baseDir, "data/shantianfang");
    let dirs = await fs.readdir(outputDir);
    dirs = dirs.filter((item) => item.includes(".json"));
    for (let i = 0; i < dirs.length; i++) {
      const bookName = dirs[i];
      await this.downloadBook(bookName);
    }
    console.log("所有专辑已下载!");
  }

  async downloadBook(bookName) {
    const { app } = this;
    const outputDir = path.join(app.baseDir, "data");
    const book = await fs.readJson(`${outputDir}/shantianfang/${bookName}`);
    await fs.ensureDir(`${outputDir}/shantianfang/${book.name}`);
    for (let i = 0; i < book.chapters.length; i++) {
      const chapter = book.chapters[i];
      await this.downloadChapter(book, chapter);
    }
    console.log(`专辑已下载: ${bookName}`);
  }

  async downloadChapter(book, chapter) {
    const { app } = this;
    const outputDir = path.join(app.baseDir, "data");
    const p = path.join(outputDir, `shantianfang/${book.name}/${chapter.name}.mp3`);
    if (chapter.downloadUrl === "") {
      return;
    }
    const url = chapter.downloadUrl.replace("doshantianfang1", "oshantianfang1");
    const stream = fs.createWriteStream(p);
    try {
      await request(url).pipe(stream);
      console.log(`下载成功: ${chapter.name}`);
    } catch (e) {
      console.log(`下载失败: ${chapter.name}`);
    }
  }
}

module.exports = PingshuService;
