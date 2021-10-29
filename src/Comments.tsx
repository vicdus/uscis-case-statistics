import React from "react";

// @ts-ignore
import { Comments as FBComments, FacebookProvider } from "react-facebook";
import WeChatDonation from "./donation_wechat.jpg";
import WechatGroupQR from "./wechat_group_qr.jpg";
import WechatQR from "./wechat_qr.jpg";
import CaseNumberFormat from "./case_number_format.png";
import Monetization from './monetization.jpg';
import Venmo from './venmo.png';

const Comments: React.FC<{}> = () => {
    const QA = (
        <div>
            <h2>捐赠是维持这个项目运营的唯一收入来源🙏</h2>
            <img
                src={Venmo}
                alt="venmo"
                style={{ width: "350px", height: "350px" }}
            />
            <img
                src={Monetization}
                alt="none"
                style={{ width: "486px", height: "303px" }}
            />
            <h3>Q and A</h3>
            <h4>Q: 怎么用？</h4>
            <p>A: 横坐标是号段，纵坐标是状态对应的数量。</p>
            <h4>Q: 什么是号段？</h4>
            <p>A: 这张图里的working day number</p>
            <img
                src={CaseNumberFormat}
                alt="wechat_donation"
                style={{ width: "472px", height: "200px" }}
            />
            <h4>Q: 你是谁？</h4>
            <p>A: 我今年抽中了h1b, 在等approve</p>
            <h4>Q: 数据来源？</h4>
            <p>A: 枚举号段下所有可能的case number并爬取USCIS, 保存成文件</p>
            <h4>Q: 一般什么时候更新数据？</h4>
            <p>
                A:
                通常美西第二天凌晨更新前一个工作日的数据，取决于uscis是否抽风以及我晚上是否喝大了忘记跑更新脚本（手动狗头
            </p>
            <h4>Q: 为什么是文件？为什么不用数据库？</h4>
            <p>A: 贫穷, github deploy静态网页不要钱</p>
            <h4>Q: 这个很有用，可以请你喝杯咖啡吗？</h4>
            <p>A: 感谢！</p>
            <img
                src={WeChatDonation}
                alt="wechat_donation"
                style={{ width: "400px", height: "560px" }}
            />

            <h4>Q: 我想和你聊一聊？</h4>
            <p>A: 加我微信吧！</p>
            <img
                src={WechatQR}
                alt="wechat"
                style={{ width: "400px", height: "560px" }}
            />
            <h4>Q: 还有别的问题想讨论？</h4>
            <p>
                A: 微信群和
                <a
                    href="https://www.1point3acres.com/bbs/forum.php?mod=viewthread&tid=636011"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    一亩三分地的帖子
                </a>
                ，请帮我加点大米：）
            </p>
            <img
                src={WechatGroupQR}
                alt="wechat_group"
                style={{ width: "400px", height: "560px" }}
            />
        </div>
    );

    const facebookCommentPlugin = (
        <FacebookProvider appId="185533902045623">
            <FBComments orderBy="reverse_time" href="https://vicdus.github.io/uscis-case-statistics/" />
        </FacebookProvider>
    );

    return (
        <div>
            {QA}
            {facebookCommentPlugin}
        </div>
    );
};

export default Comments;
