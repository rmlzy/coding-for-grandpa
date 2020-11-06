const Service = require("egg").Service;
const cheerio = require("cheerio");
const iconv = require("iconv-lite");
const fs = require("fs-extra");
const path = require("path");
const request = require("request-promise-native");

class PingshuService extends Service {
  async fetch(author) {
    const { app } = this;
    // 初始化输出目录
    await fs.ensureDir(`${app.baseDir}/data/${author}`);
    const books = await this._fetchAllBookUrls(author);
    const promises = [];
    books.forEach((book) => {
      promises.push(this._fetchChapters(book));
    });
    await Promise.all(promises);
    console.log(`已生成所有链接: ${author}`);
  }

  async _fetchAllBookUrls(author) {
    const authorMap = {
      shantianfang: [
        "http://shantianfang.zgpingshu.com/index.html",
        "http://shantianfang.zgpingshu.com/index_2.html",
        "http://shantianfang.zgpingshu.com/index_3.html",
        "http://shantianfang.zgpingshu.com/index_4.html",
        "http://shantianfang.zgpingshu.com/index_5.html",
        "http://shantianfang.zgpingshu.com/index_6.html",
        "http://shantianfang.zgpingshu.com/index_7.html",
        "http://shantianfang.zgpingshu.com/index_8.html",
      ],
      yuankuocheng: [
        "http://yuankuocheng.zgpingshu.com/index.html",
        "http://yuankuocheng.zgpingshu.com/index_2.html",
        "http://yuankuocheng.zgpingshu.com/index_3.html",
      ],
      tianlianyuan: [
        "http://tianlianyuan.zgpingshu.com/index.html",
        "http://tianlianyuan.zgpingshu.com/index_2.html",
        "http://tianlianyuan.zgpingshu.com/index_3.html",
        "http://tianlianyuan.zgpingshu.com/index_4.html",
        "http://tianlianyuan.zgpingshu.com/index_5.html",
      ],
      liulanfang: [
        "http://liulanfang.zgpingshu.com/index.html",
        "http://liulanfang.zgpingshu.com/index_2.html",
        "http://liulanfang.zgpingshu.com/index_3.html",
      ],
      lianliru: [
        "http://lianliru.zgpingshu.com/index.html",
        "http://lianliru.zgpingshu.com/index_2.html",
        "http://lianliru.zgpingshu.com/index_3.html",
        "http://lianliru.zgpingshu.com/index_4.html",
      ],
    };
    const pageUrls = authorMap[author] || [];
    if (pageUrls.length === 0) return;
    const bookUrls = [];
    for (let i = 0; i < pageUrls.length; i++) {
      const pageUrl = pageUrls[i];
      const urls = await this._fetchBookUrls(author, pageUrl);
      bookUrls.push(...urls);
    }
    return bookUrls;
  }

  async _fetchBookUrls(author, pageUrl) {
    const { ctx } = this;
    console.log(`抓取专辑: ${author}《${pageUrl}》`);
    const urls = [];
    try {
      const res = await ctx.curl(pageUrl, { type: "GET", dataType: "html", timeout: 60000 });
      const decoded = iconv.decode(res.data, "GBK");
      const $ = cheerio.load(decoded);
      $("#categoryHeader .lists2 li .title a").each(function (i, div) {
        const name = $(this).text();
        const url = $(this).attr("href");
        urls.push({ name, author, url: `http:${url}`, chapters: [] });
      });
    } catch (e) {
      console.log("_fetchBookUrls ERROR: ", e.message);
    }
    return urls;
  }

  async _fetchChapters(book) {
    const { ctx, app } = this;
    console.log(`抓取章节: ${book.author}《${book.name}》`);
    const chapters = [];
    try {
      const res = await ctx.curl(book.url, { type: "GET", dataType: "html", timeout: 10000 });
      const decoded = iconv.decode(res.data, "GBK");
      const $ = cheerio.load(decoded);
      $(".play-area .play-btns li").each(function (i, div) {
        const name = $(this).find(".player a").text();
        const url = $(this).find(".player a").attr("href");
        chapters.push({
          name: `${name} - ${book.name}`,
          url: `http:${url}`,
        });
      });
    } catch (e) {
      console.log("_fetchChapters ERROR: ", e.message);
    }

    // 抓取下载链接
    const res = [];
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      chapter.downloadUrl = await this._fetchDownloadUrl(chapter);
      res.push(chapter);
    }
    book.chapters = res;

    // 写入书籍文件
    await fs.ensureDir(`${app.baseDir}/data/${book.author}`);
    await fs.writeJson(`${app.baseDir}/data/${book.author}/${book.name}.json`, book);
  }

  async _fetchDownloadUrl(chapter) {
    const { ctx } = this;
    console.log(`抓取下载地址: ${chapter.name}`);
    let downloadUrl = "";
    try {
      const url = chapter.url.replace("/play/", "/playdata/");
      const res = await ctx.curl(url, { type: "POST", dataType: "json", timeout: 10000 });
      if (res.data.urlpath) {
        downloadUrl = res.data.urlpath.replace(".flv", ".mp3");
      }
    } catch (e) {
      console.log("_fetchDownloadUrl ERROR: ", e.message);
    }
    return downloadUrl;
  }

  async download(author) {
    const { app } = this;
    let dirs = await fs.readdir(`${app.baseDir}/data/${author}`);
    dirs = dirs.filter((item) => item.includes(".json"));
    for (let i = 0; i < dirs.length; i++) {
      const bookName = dirs[i];
      const dirName = bookName.replace(".json", "");
      if (fs.existsSync(`${outputDir}/${dirName}`)) {
        console.log(`已存在: ${dirName}`);
        continue;
      }
      await this._downloadBook(author, bookName);
    }
    console.log("所有专辑已下载!");
  }

  async _downloadBook(author, bookName) {
    const { app } = this;
    const book = await fs.readJson(`${app.baseDir}/data/${author}/${bookName}`);
    await fs.ensureDir(`${app.baseDir}/data/${author}/${book.name}`);
    console.log(`下载专辑： ${author}《${bookName}》`);
    for (let i = 0; i < book.chapters.length; i++) {
      const chapter = book.chapters[i];
      await this._downloadChapter(book, chapter);
    }
  }

  async _downloadChapter(book, chapter) {
    const { app } = this;
    if (chapter.downloadUrl === "") return;
    console.log(`下载章节：${chapter.name}《${book.name}》`);
    const url = chapter.downloadUrl.replace("doshantianfang1", "oshantianfang1");
    const outputFileName = path.join(app.baseDir, `data/${book.author}/${book.name}/${chapter.name}.mp3`);
    try {
      const buffer = await request.get({ uri: url, encoding: null });
      await fs.writeFile(outputFileName, buffer);
    } catch (e) {
      console.log(`下载章节失败: ${chapter.name}`);
    }
  }
}

module.exports = PingshuService;
