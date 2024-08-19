## 简易的WebRTC示例

​	**必须部署在localhost下**，或者部署在https下

​		`getUserMedia` 只能在安全上下文（HTTPS 或 localhost）中运行。如果您		的页面是在 HTTP 上运行的，浏览器会禁用访问用户设备的权限，包括 		`navigator.mediaDevices`

### 信令服务器的部署：

```sh
node server.js
```

### 客户端的部署：

​	在index.html所在目录执行：

​		`npx http-server -p 4000`(你要部署在的端口)

### 使用说明：

1. 先运行开启服务端，打开运行两个客户端网页，输入任意相同的房间号加入
2. 一方发起聊天，一方接受，即可进行 WebRTC 音视频通信
3. 实现了基本的通信和简单的离开房间功能，仍需优化。