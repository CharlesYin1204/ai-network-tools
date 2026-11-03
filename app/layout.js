import "./globals.css";
export const metadata = {
  title: "AI人脉工具 · 让连接发生，让价值流动",
  description:
    "发现身边的闲置资源，连接值得信任的人。AI人脉工具 AI 熟人资源协作平台。",
  applicationName: "AI人脉工具",
  manifest: "/manifest.webmanifest",
};
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#167557",
};
export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
