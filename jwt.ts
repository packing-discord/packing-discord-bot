import jsonwebtoken from 'jsonwebtoken';

export const sign = (data: any) => {
    return jsonwebtoken.sign(data, process.env.PRIVATE_KEY!);
};

export const verify = (token: string) => {
    try {
        return jsonwebtoken.verify(token, process.env.PRIVATE_KEY!);
    } catch (e) {
        return null;
    }
};
