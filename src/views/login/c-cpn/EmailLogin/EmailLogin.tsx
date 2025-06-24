import React from 'react';
import { Form, Input, Button, message, Card, Typography } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface EmailLoginProps {
  onLogin: (credentials: { email: string; password: string }) => void;
  loading?: boolean;
  errorMessage?: string;
}

const EmailLogin: React.FC<EmailLoginProps> = ({ onLogin, loading, errorMessage }) => {
  const [form] = Form.useForm();

  const validateEmail = (email: string) => {
    // 简单邮箱格式校验
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (!validateEmail(values.email)) {
        message.error('请输入有效的邮箱地址');
        return;
      }

      onLogin({ email: values.email.trim(), password: values.password.trim() });
    } catch (error) {
      console.log('验证失败:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
      <Card className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Title level={3}>登录</Title>
        </div>

        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ remember: true }}>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱地址' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="请输入邮箱" disabled={loading} />
          </Form.Item>

          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" disabled={loading} />
          </Form.Item>

          {errorMessage && <div className="mb-4 text-red-500 text-center">{errorMessage}</div>}

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default EmailLogin;
