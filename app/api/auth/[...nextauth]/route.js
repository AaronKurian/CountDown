import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const passwordHash = process.env.ADMIN_PASSWORD_HASH;

        if (!passwordHash || !credentials?.username || !credentials?.password) {
          return null;
        }

        const isUsernameValid = credentials.username === 'admin';
        const isPasswordValid = await bcrypt.compare(credentials.password, passwordHash);

        if (isUsernameValid && isPasswordValid) {
          return {
            id: '1',
            name: 'Admin',
            role: 'admin'
          };
        }
        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      return session;
    }
  },
  pages: {
    signIn: '/admin',
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 
