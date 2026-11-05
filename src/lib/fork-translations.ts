// Gira+ Multi: strings for the multi-account features, kept apart from upstream's translations so
// rebases don't conflict. Spread into the translations object in $lib/translations.
export const forkTranslations = {
	multi_new_account_title: {
		en: 'New account',
		pt: 'Nova conta',
	},
	multi_new_account_subtext: {
		en: 'Add another Gira account',
		pt: 'Adicionar outra conta Gira',
	},
	multi_sign_in: {
		en: 'Sign in',
		pt: 'Iniciar sessão',
	},
	multi_add_account_title: {
		en: 'Add an account',
		pt: 'Adicionar uma conta',
	},
	multi_active_label: {
		en: 'Active',
		pt: 'Ativa',
	},
	multi_switch_title: {
		en: 'Switch account',
		pt: 'Mudar de conta',
	},
	multi_switch_button: {
		en: 'Switch',
		pt: 'Mudar',
	},
	multi_active_trip_title: {
		en: 'This account already has a trip',
		pt: 'Esta conta já tem uma viagem',
	},
	multi_active_trip_message: {
		en: 'Unlock this bike with another account:',
		pt: 'Desbloquear esta bicicleta com outra conta:',
	},
	multi_ghost_trip_title: {
		en: 'This trip looks stuck',
		pt: 'Esta viagem parece presa',
	},
	multi_ghost_trip_message: {
		en: 'The bike reports it\'s docked, but EMEL still shows this trip open. Unlock your next bike with another account:',
		pt: 'A bicicleta indica que está na doca, mas a EMEL ainda mostra esta viagem aberta. Desbloquear a próxima bicicleta com outra conta:',
	},
	multi_main_label: {
		en: 'Main',
		pt: 'Principal',
	},
	multi_trip_running_label: {
		en: 'Trip running',
		pt: 'Viagem a decorrer',
	},
	multi_pass_expired_label: {
		en: 'Pass expired',
		pt: 'Passe expirado',
	},
	multi_no_pass_label: {
		en: 'No pass',
		pt: 'Sem passe',
	},
	multi_dock_waiting_title: {
		en: 'Confirming the trip has ended…',
		pt: 'A confirmar o fim da viagem…',
	},
	multi_dock_waiting_message: {
		en: "The bike is in the dock. Wait for the dock's sound and light signal, and stay here until the trip ends.",
		pt: 'A bicicleta está na doca. Espere pelo sinal sonoro e luminoso da doca e fique por aqui até a viagem terminar.',
	},
	multi_dock_ended_title: {
		en: 'Trip ended',
		pt: 'Viagem terminada',
	},
	multi_dock_ended_message: {
		en: 'You can go now.',
		pt: 'Já pode sair daqui.',
	},
	multi_dock_stuck_title: {
		en: "The trip hasn't ended",
		pt: 'A viagem não terminou',
	},
	multi_dock_stuck_message: {
		en: "The bike reports it's in the dock, but EMEL still shows this trip open. Note the time.",
		pt: 'A bicicleta indica que está na doca, mas a EMEL ainda mostra esta viagem aberta. Anote a hora.',
	},
	multi_dock_problem_title: {
		en: "The trip hasn't ended yet",
		pt: 'A viagem ainda não terminou',
	},
	multi_dock_problem_message: {
		en: 'The bike reported a problem. Push it in again until it locks, or try another dock.',
		pt: 'A bicicleta reportou um problema. Empurre-a de novo até bloquear, ou tente outra doca.',
	},
	multi_dock_other_account: {
		en: 'Use another account',
		pt: 'Usar outra conta',
	},
	multi_false_trip: {
		en: 'False trip',
		pt: 'Viagem falsa',
	},
	multi_email_emel: {
		en: 'Write to EMEL',
		pt: 'Escrever à EMEL',
	},
	multi_mark_false_trip: {
		en: 'Mark as a false trip',
		pt: 'Marcar como viagem falsa',
	},
	multi_unmark_false_trip: {
		en: 'Remove the false trip mark',
		pt: 'Retirar a marca de viagem falsa',
	},
	multi_copy_trip_log: {
		en: 'Copy the trip log',
		pt: 'Copiar o registo da viagem',
	},
	multi_trip_log_copied: {
		en: 'Trip log copied',
		pt: 'Registo da viagem copiado',
	},
	multi_edit_email_text: {
		en: 'Edit the email text',
		pt: 'Editar o texto do email',
	},
	multi_email_not_main_title: {
		en: 'Not the Main account',
		pt: 'Não é a conta principal',
	},
	multi_email_not_main_message: {
		en: "You're on {{email}}, which isn't your Main account. Send from this account's own address: an email from another address shows EMEL that the accounts belong to the same person.",
		pt: 'Está na conta {{email}}, que não é a principal. Envie a partir do endereço desta conta: um email de outro endereço mostra à EMEL que as contas são da mesma pessoa.',
	},
	multi_continue: {
		en: 'Continue',
		pt: 'Continuar',
	},
	multi_email_text_title: {
		en: 'Your email text',
		pt: 'O seu texto do email',
	},
	multi_email_text_message: {
		en: 'It stays on this phone only, and the app adds the trip details after it. Write only true facts.',
		pt: 'Fica só neste telemóvel, e a app junta-lhe os dados da viagem. Escreva só factos verdadeiros.',
	},
	multi_email_text_placeholder: {
		en: 'Write your text here',
		pt: 'Escreva aqui o seu texto',
	},
	multi_save: {
		en: 'Save',
		pt: 'Guardar',
	},
	multi_email_send_title: {
		en: 'Email to EMEL',
		pt: 'Email para a EMEL',
	},
	multi_email_send_message: {
		en: 'This opens a draft in your email app. Check it before sending.',
		pt: 'Abre um rascunho na sua aplicação de email. Reveja-o antes de enviar.',
	},
	multi_open_email: {
		en: 'Open email',
		pt: 'Abrir email',
	},
	multi_not_now: {
		en: 'Not now',
		pt: 'Agora não',
	},
	multi_trip_switch_warning: {
		en: 'Switching stops tracking the current trip in this app. The trip itself keeps running until the bike is docked.',
		pt: 'Ao mudar de conta, a viagem atual deixa de ser acompanhada nesta aplicação. A viagem continua até a bicicleta ser devolvida.',
	},
	multi_switch_invalid_credentials: {
		en: 'Couldn\'t log in to {{email}}: the password was rejected.',
		pt: 'Não foi possível entrar em {{email}}: a palavra-passe foi rejeitada.',
	},
	multi_switch_failed: {
		en: 'Couldn\'t switch account. Check your connection and try again.',
		pt: 'Não foi possível mudar de conta. Verifique a ligação e tente novamente.',
	},
	multi_remove_title: {
		en: 'Remove account?',
		pt: 'Remover conta?',
	},
	multi_remove_message: {
		en: '{{email}} will be removed from this phone. You can add it again later.',
		pt: '{{email}} será removida deste telemóvel. Pode adicioná-la novamente mais tarde.',
	},
	multi_remove_button: {
		en: 'Remove',
		pt: 'Remover',
	},
	multi_close_menu: {
		en: 'Close',
		pt: 'Fechar',
	},
	multi_paid_only: {
		en: 'Paid only',
		pt: 'Só pagas',
	},
	multi_no_paid_trips: {
		en: 'No paid trips',
		pt: 'Sem viagens pagas',
	},
	multi_look_further_back: {
		en: 'Look further back',
		pt: 'Procurar mais atrás',
	},
	multi_trip_button: {
		en: 'Not your trip? Switch account',
		pt: 'Não é a sua viagem? Mudar de conta',
	},
} as const;