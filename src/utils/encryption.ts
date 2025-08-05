/**
 * 简单的API Key加密工具
 * 使用设备特征生成密钥，提供基础的API Key保护
 */
export class APIKeyEncryption {
    private static getDeviceKey(): string {
        // 使用设备特征生成一个相对稳定的密钥
        const deviceInfo = `${navigator.userAgent}-${screen.width}-${screen.height}-${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
        // 使用简单的哈希算法生成密钥
        return this.simpleHash(deviceInfo).substring(0, 32);
    }

    /**
     * 简单哈希函数（替代crypto.createHash）
     */
    private static simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        // 转换为16进制字符串并重复以达到足够长度
        const hashStr = Math.abs(hash).toString(16);
        return (hashStr + hashStr + hashStr + hashStr).substring(0, 64);
    }

    /**
     * 简单的XOR加密
     */
    private static xorEncrypt(text: string, key: string): string {
        const result = [];
        for (let i = 0; i < text.length; i++) {
            result.push(String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length)));
        }
        return btoa(result.join(''));
    }

    /**
     * 解密
     */
    private static xorDecrypt(encrypted: string, key: string): string {
        try {
            const text = atob(encrypted);
            const result = [];
            for (let i = 0; i < text.length; i++) {
                result.push(String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length)));
            }
            return result.join('');
        } catch (error) {
            console.error('解密失败:', error);
            return '';
        }
    }

    /**
     * 加密API Key
     */
    static encryptAPIKey(apiKey: string): string {
        if (!apiKey || apiKey.trim() === '') {
            return '';
        }
        
        const deviceKey = this.getDeviceKey();
        return this.xorEncrypt(apiKey, deviceKey);
    }

    /**
     * 解密API Key
     */
    static decryptAPIKey(encryptedApiKey: string): string {
        if (!encryptedApiKey || encryptedApiKey.trim() === '') {
            return '';
        }

        const deviceKey = this.getDeviceKey();
        return this.xorDecrypt(encryptedApiKey, deviceKey);
    }

    /**
     * 检查字符串是否已加密（简单检测）
     */
    static isEncrypted(value: string): boolean {
        // API Key通常以'sk-'开头，如果不是且包含base64字符，可能已加密
        return value && !value.startsWith('sk-') && /^[A-Za-z0-9+/]*={0,2}$/.test(value);
    }
}