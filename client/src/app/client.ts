export type ResetPasswordResponse = {
  status: 'OK';
};

class Client {
  resetPassword(email: string): Promise<ResetPasswordResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (true) {
          resolve({status: 'OK'});
        } else {
          reject(new Error('boom!'));
        }
      }, 1000);
    });
  }
}

const client = new Client();
export default client;
