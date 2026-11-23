// Gira+ Multi: where Gira+ keeps the login it opens with, so the fork can point it at the main account before
// Gira+ reads it. Gira+ v1.7.1 keeps it under the `email` and `password` Preferences keys. From its commit c10dad2
// ("keep the account credentials in the OS's secure storage") on, `$lib/credentials` keeps it in secure storage and
// moves the old keys over the first time it's read. The glob finds that module only once a rebase brings it in, so
// the fork works with both and adds no dependency of its own. fork-upstream.test.ts fails if Gira+ moves it again.
import { Preferences } from '@capacitor/preferences';

export type StartupLogin = {
	/** The email Gira+ will open with, or null when it would open logged out. */
	read: () => Promise<string | null>;
	/** Makes Gira+ open with this login. */
	write: (login: { email: string, password: string }) => Promise<void>;
};

type CredentialsModule = {
	loadCredentials: () => Promise<{ email: string, password: string } | null>;
	saveCredentials: (credentials: { email: string, password: string }) => Promise<void>;
};

export const upstreamCredentials = import.meta.glob<CredentialsModule>('./credentials.ts', { eager: true });

const preferencesLogin: StartupLogin = {
	read: () => Preferences.get({ key: 'email' }).then(result => result.value),
	write: async ({ email, password }) => {
		await Promise.all([Preferences.set({ key: 'email', value: email }), Preferences.set({ key: 'password', value: password })]);
	},
};

export function startupLogin(modules: Record<string, CredentialsModule> = upstreamCredentials): StartupLogin {
	const credentials = Object.values(modules)[0];
	if (!credentials) return preferencesLogin;
	const { loadCredentials, saveCredentials } = credentials;
	return {
		// Reading first also lets Gira+ move a login an older version left in Preferences
		read: async () => (await loadCredentials())?.email ?? null,
		write: ({ email, password }) => saveCredentials({ email, password }),
	};
}