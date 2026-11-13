# 官方依据（2026-11-13 更新）

- [Adobe CEP 官方 Cookbook](https://github.com/Adobe-CEP/CEP-Resources/blob/master/CEP_12.x/Documentation/CEP%2012%20HTML%20Extension%20Cookbook.md)：AE 18.4 开始 CEP 11，AE 25 开始 CEP 12。另直接检查本机包确认 CEP 11.5.3.132；因此 manifest 只声明 AE 24.x。
- [Adobe 官方 CEP 示例](https://github.com/Adobe-CEP/Samples)：AfterEffectsPanel 展示 CEP 与 ExtendScript 交互。这里只使用平台接口，未复制样例代码。
- [Adobe AE Scripts 文档](https://helpx.adobe.com/after-effects/desktop/automate-in-after-effects/automate-animation/scripts.html)：ExtendScript 脚本及脚本文件/网络权限。测试使用安装包内 ae.sdef 公布的 DoScript 接口。
- [Adobe CEP 11 Cookbook](https://github.com/Adobe-CEP/CEP-Resources/blob/master/CEP_11.x/Documentation/CEP%2011.1%20HTML%20Extension%20Cookbook.md)：启用 Node.js API 与 CEP V8 的原生模块兼容限制。因此 macOS Keychain 使用独立 Security.framework helper，不在 CEF 内直接加载 Node 原生模块。
- [OpenAI Sign in with ChatGPT 快速开始](https://developers.openai.com/siwc/quickstart)：开源本机客户端可请求用户授权使用 ChatGPT 计划额度，不需要客户端密钥或 API key；计划使用授权是单独权限，不会开放 ChatGPT 对话记录。
- [OpenAI 本机开源客户端登录流程](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)：动态客户端注册、浏览器授权、环回回调、state / nonce / PKCE、令牌交换、ID Token 签名验证及凭据存储要求。本实现按公开协议独立实现，没有复制 DevKit 代码。
- [OpenAI 令牌与会话](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions)：刷新令牌轮换、账户断开和令牌撤销要求。
- [OpenAI 模型与推理](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)：按账号读取模型列表；请求使用 `store:false`、`stream:true`，仅在 `response.completed` 后视为成功。
- [OpenAI 计划使用预览限制](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)：只有所选模型接受图片输入时才能使用图像帧；该授权模式不支持直接视频、音频、文件上传及图像生成。参考视频需在本机抽帧后发送图片。
- [OpenAI Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create)：模型请求与结构化输出。`store:false` 不代表供应商完全不保留数据；最终仍需遵守部门数据规则。
- [OpenAI Sign in with ChatGPT DevKit 许可](https://github.com/openai/sign-in-with-chatgpt-devkit/blob/main/LICENSE)：官方 DevKit 为非商业许可，条款排除代表雇主开发、测试、分发或运行的用途。本项目没有使用或复制该 DevKit。

运行时依赖 Adobe CEP 提供的 Node API 与随扩展构建的 macOS Keychain helper。helper 使用 Apple Foundation 与 Security 框架；其 Universal arm64 / x86_64 构建脚本最低要求 macOS 13。CEP 内的实际钥匙串访问和 OAuth 流程尚未在真实 AE 中验证。

本版不抓取聊天网页、不读取其他客户端登录令牌、不把会员登录转成 API 代理，也不使用 MCP。Claude、Gemini、Ollama 尚未接入；接入前需分别核实视觉、工具、结构化输出、上下文及授权条款。
