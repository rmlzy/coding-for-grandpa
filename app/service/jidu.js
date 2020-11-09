const Service = require("egg").Service;
const cheerio = require("cheerio");
const iconv = require("iconv-lite");
const fs = require("fs-extra");
const path = require("path");
const request = require("request-promise-native");

class PingshuService extends Service {
  async fetch() {
    const { ctx, app } = this;
    const authors = await this._fetchAuthors();
    await fs.writeJson(`${app.baseDir}/output/jidu/author.json`, authors);
  }

  async _fetchAuthors() {
    const { ctx } = this;
    const authors = [];
    try {
      const res = await ctx.curl("http://www.jdjgq.com/singer/", { type: "GET", dataType: "html", timeout: 6000 });
      const decoded = iconv.decode(res.data, "GBK");
      const $ = cheerio.load(decoded);
      $(".singer a").each(function (i, div) {
        const name = $(this).text();
        const url = $(this).attr("href");
        authors.push({
          name,
          url: url.startsWith("http") ? url : `http://www.jdjgq.com${url}`,
        });
      });
    } catch (e) {
      // ignore
    }

    const res = [];
    for (let i = 0; i < authors.length; i++) {
      const author = authors[i];
      const mainPage = await this._fetchMainPage(author.url);
      if (mainPage) {
        res.push({ ...author, mainPage });
      }
    }
    return res;
  }

  async _fetchMainPage(author) {
    console.log("抓取作者主页: ", author.name);
    const { ctx } = this;
    let mainUrl = "";
    try {
      const res = await ctx.curl(author.url, { type: "GET", dataType: "html", timeout: 6000 });
      const decoded = iconv.decode(res.data, "GBK");
      const $ = cheerio.load(decoded);
      $(".des .s10 a").each(function (i, div) {
        const text = $(this).text();
        const url = $(this).attr("href");
        if (text.includes("全部歌曲排行")) {
          mainUrl = url.startsWith("http") ? url : `http://www.jdjgq.com${url}`;
        }
      });
    } catch (e) {
      // ignore
    }
    return mainUrl;
  }

  async _fetchSongs() {
    const { app } = this;
    await fs.ensureDir(`${app.baseDir}/output/jidu/`);
    const url =
      "http://www.jdjgq.com/e/action/ListInfo.php?mid=12&tempid=14&ph=1&singer=%B0%AE%B6%F7%CA%AB%B0%E0&orderby=onclick";
  }
}

module.exports = PingshuService;
