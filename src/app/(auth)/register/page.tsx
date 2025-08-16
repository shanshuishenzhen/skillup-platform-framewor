import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="flex justify-center items-center py-12">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle>创建您的 SkillUp 账户</CardTitle>
          <CardDescription>只需几步，开启您的学习之旅</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">手机号</label>
              <div className="flex space-x-2">
                <Input id="phone" type="tel" placeholder="请输入您的手机号" required className="flex-grow" />
                <Button type="button" variant="outline">发送验证码</Button>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium">短信验证码</label>
              <Input id="code" type="text" placeholder="请输入6位验证码" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">设置密码</label>
              <Input id="password" type="password" placeholder="请输入您的密码" required />
            </div>
            <Button type="submit" className="w-full !mt-6">注册</Button>
          </form>
          <div className="mt-4 text-center text-sm">
            已有账户?{" "}
            <Link href="/login" className="underline text-primary hover:text-primary/80">
              直接登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
