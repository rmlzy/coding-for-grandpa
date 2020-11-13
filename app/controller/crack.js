"use strict";

const Controller = require("egg").Controller;
const cryptoRandomString = require("crypto-random-string");
const _ = require("lodash");
const fs = require("fs-extra");

class CrackController extends Controller {
  async random() {
    const { ctx } = this;
    let total = 10000;
    let ok = 0;
    let errors = [];
    for (let i = 0; i < total; i++) {
      const text = cryptoRandomString({ length: 6, type: "alphanumeric" });
      if (this._isUseful(text)) {
        ok += 1;
      } else {
        errors.push(text);
      }
    }
    // const ok = this._isUseful("P1xJ73");
    const percent = ((ok / total) * 100).toFixed(4);
    ctx.body = {
      message: `成功率: ${percent}%`,
      temp: this._isUseful("4RA2A4"),
      total,
      ok,
      errors,
    };
  }

  async gen() {
    const { ctx } = this;
    ctx.runInBackground(() => {
      this._genPwd();
    });
    ctx.body = "OK";
  }

  _isRepeat(pwd) {
    const pwds = pwd.split("");
    let m = {};
    let isRepeat = false;
    for (let i = 0; i < pwds.length; i++) {
      const pwd = pwds[i];
      if (m[pwd]) {
        if (m[pwd] > 2) {
          isRepeat = true;
          break;
        } else {
          m[pwd] += 1;
        }
      } else {
        m[pwd] = 1;
      }
    }
    return isRepeat;
  }

  _isUpper(text) {
    return text.toUpperCase() === text;
  }

  _isLower(text) {
    return text.toLowerCase() === text;
  }

  _isUseful(pwd) {
    const pwds = pwd.split("").map((pwd) => {
      const n = Number(pwd);
      return isNaN(n) ? pwd : n;
    });

    if (this._isRepeat(pwd)) {
      return false;
    }

    const nums = pwds.filter((pwd) => _.isNumber(pwd));
    if (nums.length > 2) {
      return false;
    }

    const chars = pwds.filter((pwd) => !_.isNumber(pwd));
    const uppers = chars.filter((pwd) => this._isUpper(pwd));
    if (uppers.length > 4) {
      return false;
    }

    const lowers = chars.filter((pwd) => this._isLower(pwd));
    if (lowers.length > 4) {
      return false;
    }

    return true;
  }

  async _genPwd() {
    const { app } = this;
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const useful = [];
    for (let l1 = 0; l1 < letters.length; l1++) {
      for (let l2 = 0; l2 < letters.length; l2++) {
        for (let l3 = 0; l3 < letters.length; l3++) {
          for (let l4 = 0; l4 < letters.length; l4++) {
            for (let l5 = 0; l5 < letters.length; l5++) {
              for (let l6 = 0; l6 < letters.length; l6++) {
                const pwd = `${letters[l1]}${letters[l2]}${letters[l3]}${letters[l4]}${letters[l5]}${letters[l6]}`;
                if (this._isUseful(pwd)) {
                  if (useful.length === 1000) {
                    await fs.appendFile(`${app.baseDir}/pwd.txt`, useful.join("\n") + "\n");
                  } else {
                    useful.push(pwd);
                  }
                }
              }
            }
          }
        }
      }
    }
    if (useful.length) {
      await fs.appendFile(`${app.baseDir}/pwd.txt`, useful.join("\n") + "\n");
    }
  }
}

module.exports = CrackController;
