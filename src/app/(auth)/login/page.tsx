import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex justify-center items-center py-12">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle>登录您的 SkillUp 账户</CardTitle>
          <CardDescription>使用您的手机号和密码登录</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">手机号</label>
              <Input id="phone" type="tel" placeholder="请输入您的手机号" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">密码</label>
              <Input id="password" type="password" placeholder="请输入您的密码" required />
            </div>
            <Button type="submit" className="w-full !mt-6">登录</Button>
          </form>
          <div className="mt-4 text-center text-sm">
            还没有账户?{" "}
            <Link href="/register" className="underline text-primary hover:text-primary/80">
              立即注册
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
