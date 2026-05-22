// 文件路径: lib/routes/cqksy/column.ts
import { Route } from '@/types';
import ofetch from '@/utils/ofetch'; // 统一使用的请求库
import { load } from 'cheerio'; // 类似 jQuery 的 HTML 解析器
import { parseDate } from '@/utils/parse-date'; // 解析日期的工具函数

export const route: Route = {
    path: '/cqksy/column/:id?', // 路由路径
    categories: ['government'], // 路由分类
    example: '/cqksy/column/1846541', // 示例路径
    parameters: { id: '栏目ID，默认为 1846541 (普通高考)。' }, // 参数说明
    features: { // 路由特性
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [ // Radar 规则，用于浏览器扩展
        {
            source: ['www.cqksy.cn/web/column/col:id.html'],
            target: '/cqksy/column/:id',
        },
    ],
    name: '普通高考',
    maintainers: ['cbw7172002'], // 请替换为你的 GitHub 用户名
    handler: async (ctx) => {
        const { id = '1846541' } = ctx.req.param();
        const baseUrl = 'https://www.cqksy.cn';
        const columnUrl = `${baseUrl}/web/column/col${id}.html`;

        // 1. 获取并解析栏目列表页
        const response = await ofetch(columnUrl);
        const $ = load(response);

        // 提取栏目名称
        const columnName = $('.colName').text().trim() || '考试招生';

        // 2. 提取文章列表
        const items = $('.content .content-item')
            .toArray()
            .map((item) => {
                const $item = $(item);
                const title = $item.find('p').text().trim();
                const link = $item.attr('href');
                const dateStr = $item.find('span').text().trim();
                return {
                    title,
                    link: link?.startsWith('http') ? link : `${baseUrl}${link}`,
                    pubDate: dateStr ? parseDate(dateStr) : undefined,
                };
            });

        // 3. 返回 RSS 源数据
        return {
            title: `${columnName} - 重庆市教育考试院`,
            link: columnUrl,
            description: `${columnName}栏目最新信息`,
            item: items,
        };
    },
};