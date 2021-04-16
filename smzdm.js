/**
 * 什么值得买签到程序 
 * 支持自动签到，自动错误邮件提醒
 * xuess<wuniu2010@126.com>
 */

const request = require('./lib/request_https');
const cheerio = require("cheerio"); //文档转换
const ejs = require("ejs"); //模板
const schedule = require("node-schedule"); //定时器
const { getRandom, ascii2native } = require('./lib/utils'); //工具类
const { mailSend } = require("./lib/mail"); //发邮件
const { cookieListValKey, commitList } = require("./config"); //配置文件

console.log('什么值得买 签到相关', new Date());


//日志信息
let logoInfoCommit = [];
let logoInfoSign = [];


/**
 * 什么值得买签到  
 * @param {Object} cookieSess
 */
let smzdmSign = (cookieSess) => {
	let cookie = cookieSess.cookies;
	let cookieName = cookieSess.username;
	let referer = 'http://www.smzdm.com/qiandao/';
	let options = {
		url: 'https://zhiyou.smzdm.com/user/checkin/jsonp_checkin?callback=jQuery112409568846254764496_' + new Date().getTime() + '&_=' + new Date().getTime(),
		type: 'GET'
	}

	new Promise((resolve, reject) => {
		options.callback = (data, _setCookie) => {
			try {
				console.log('data===', data);
				if(data.indexOf('"error_code":0') != -1) {
					console.log(new Date().Format("yyyy-MM-dd hh:mm:ss") + ' -- 什么值得买 签到成功!!!!');
					//记录签到日志
					let logInfo = {};
					logInfo.cookie = cookieSess.username;
					logInfo.date = new Date().Format("yyyy-MM-dd hh:mm:ss");
					logInfo.data = ascii2native(data);
					let resJson = JSON.parse(`{${data.substring(data.indexOf('"add_point"'),data.indexOf('"slogan"')-1)}}`)
					logInfo.jsonData = resJson;
					logoInfoSign.push(logInfo);
				} else {
					//发邮件
					mailSend('什么值得买【签到报错】', `时间: ${new Date().Format("yyyy-MM-dd hh:mm:ss")}  <br/>用户: ${cookieName} <br/>错误内容: ${ascii2native(data)}`);
				}
			} catch(error) {
				console.log(error);
				//发邮件
				mailSend('什么值得买【签到报错】', `时间: ${new Date().Format("yyyy-MM-dd hh:mm:ss")}  <br/>用户: ${cookieName} <br/>错误内容: ${ascii2native(error)}`);
			} finally {}
		}
		request(options, cookie, referer);
	});

}

//延迟执行签到
let setTimeSmzdmSign = (cookieSess) => {
	setTimeout(() => {
		//签到
		smzdmSign(cookieSess);
		console.log('签到！！');
		}, getRandom(1000, 100000));
//	}, getRandom(10000, 10000000));
}


//每天5点10执行 签到和评论
schedule.scheduleJob('30 10 5 * * *', () => {
	//发现频道 最新
	getPostID(getCommitUrl(), 'https://www.smzdm.com/jingxuan/');
	for(let i = 0; i < cookieListValKey.length; i++) {
		let cookieSess = cookieListValKey[i];
		//延迟签到
		setTimeSmzdmSign(cookieSess);
	}
});


//每天17点30 发邮件
schedule.scheduleJob('30 30 17 * * *', () => {
	try {
		
		//使用ejs 模板引擎发送html 内容 2018-05-13 
		let data = {logoInfoSign, logoInfoCommit};
		ejs.renderFile('./lib/mail-template.ejs', data, {}, function(err, str){
		    mailSend(new Date().Format("yyyy-MM-dd") + '什么值得买签到评论日志', str);
		});

	} catch(error) {
		console.log(error);
	} finally {
		//清空
		logoInfoCommit = [];
		logoInfoSign = [];
	}
});



}
