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
	multi_email_send_from: {
		en: 'Send it from',
		pt: 'Envie a partir de',
	},
	multi_email_send_from_hint: {
		en: 'Your email app picks the sender itself. Check that the sender (From) is this address: EMEL handles requests about an account from the email registered on it.',
		pt: 'A aplicação de email escolhe o remetente sozinha. Confirme que o remetente (De) é este endereço: a EMEL trata os pedidos sobre uma conta a partir do email registado nela.',
	},
	multi_copy: {
		en: 'Copy',
		pt: 'Copiar',
	},
	multi_copied: {
		en: 'Copied',
		pt: 'Copiado',
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
	multi_fav_home: {
		en: 'Home',
		pt: 'Casa',
	},
	multi_fav_work: {
		en: 'Work',
		pt: 'Trabalho',
	},
	multi_fav_other: {
		en: 'Other',
		pt: 'Outro',
	},
	multi_fav_save_as: {
		en: 'Save as',
		pt: 'Guardar como',
	},
	multi_fav_replaces: {
		en: 'Replaces: {{name}}',
		pt: 'Substitui: {{name}}',
	},
	multi_fav_rename: {
		en: 'Name',
		pt: 'Nome',
	},
	multi_fav_replace: {
		en: 'Change place',
		pt: 'Mudar o local',
	},
	multi_fav_remove: {
		en: 'Remove',
		pt: 'Remover',
	},
	multi_fav_replace_placeholder: {
		en: 'New place for {{name}}',
		pt: 'Novo local para {{name}}',
	},
	multi_fav_station_closed: {
		en: 'Closed',
		pt: 'Fechada',
	},
	multi_fav_name_icon: {
		en: 'Name and icon',
		pt: 'Nome e ícone',
	},
	multi_fav_other_sub: {
		en: 'Give it a name and icon',
		pt: 'Dar nome e ícone',
	},
	multi_fav_other_sub_station: {
		en: 'Give it a name',
		pt: 'Dar nome',
	},
	multi_fav_stops_being: {
		en: 'No longer {{name}}',
		pt: 'Deixa de ser {{name}}',
	},
	multi_fav_unset_home: {
		en: 'Not set yet',
		pt: 'Ainda não definida',
	},
	multi_fav_unset_work: {
		en: 'Not set yet',
		pt: 'Ainda não definido',
	},
	multi_fav_add: {
		en: 'Add',
		pt: 'Adicionar',
	},
	multi_fav_picking: {
		en: 'Choosing {{name}}',
		pt: 'A escolher {{name}}',
	},
	multi_fav_picking_add: {
		en: 'Choosing a place',
		pt: 'A escolher um local',
	},
	multi_fav_pick_add_placeholder: {
		en: 'Search for a place',
		pt: 'Pesquisar um local',
	},
	multi_fav_remove_confirm: {
		en: 'Tap again to remove',
		pt: 'Toque de novo para remover',
	},
	multi_fav_bikes_short: {
		en: 'Bikes',
		pt: 'Bic.',
	},
	multi_fav_docks_short: {
		en: 'Docks',
		pt: 'Docas',
	},
	multi_fav_saved: {
		en: 'Saved',
		pt: 'Guardada',
	},
	multi_fav_saved_as: {
		en: 'Saved as {{name}}',
		pt: 'Guardado como {{name}}',
	},
	multi_fav_moved: {
		en: '{{name}}: new place saved',
		pt: '{{name}}: novo local guardado',
	},
	multi_fav_pick_hold: {
		en: 'Hold a spot on the map',
		pt: 'Mantenha premido no mapa',
	},
	multi_bolacha_order: {
		en: 'Order bolacha Maria',
		pt: 'Encomendar bolacha Maria',
	},
	multi_bolacha_taps_left: {
		en: '{{count}} taps away from opening the tasca.',
		pt: 'Faltam {{count}} toques para abrir a tasca.',
	},
	multi_bolacha_tap_left: {
		en: '1 tap away from opening the tasca.',
		pt: 'Falta 1 toque para abrir a tasca.',
	},
	multi_dock_notes_title: {
		en: 'Docks that work',
		pt: 'Docas que funcionam',
	},
	multi_dock_notes_message: {
		en: 'Red docks that still take a bike. While empty, they count as free docks in this station\'s menu.',
		pt: 'Docas vermelhas que aceitam a bicicleta. Enquanto estiverem vazias, contam como docas livres no menu desta estação.',
	},
	multi_dock_notes_placeholder: {
		en: 'Dock number',
		pt: 'Número da doca',
	},
	multi_dock_notes_add: {
		en: 'Add',
		pt: 'Adicionar',
	},
	multi_dock_notes_remove: {
		en: 'Remove dock {{dock}}',
		pt: 'Remover a doca {{dock}}',
	},
	multi_plan_from: {
		en: 'From {{name}}',
		pt: 'De {{name}}',
	},
	multi_resume_route: {
		en: 'Resume route',
		pt: 'Retomar rota',
	},
	multi_plan_live: {
		en: 'Bikes and free docks as of {{time}}',
		pt: 'Bicicletas e docas livres às {{time}}',
	},
	multi_plan_back: {
		en: 'Back to your location',
		pt: 'Voltar à sua localização',
	},
	multi_plan_picking: {
		en: 'Choosing where to start',
		pt: 'A escolher o ponto de partida',
	},
	multi_plan_pick_placeholder: {
		en: 'Search for the starting point',
		pt: 'Pesquisar o ponto de partida',
	},
	multi_dock_notes_done: {
		en: 'Done',
		pt: 'Concluído',
	},
	multi_update_button: {
		en: 'Update',
		pt: 'Atualizar',
	},
	multi_update_downloading: {
		en: 'Downloading…',
		pt: 'A transferir…',
	},
	multi_update_downloading_percent: {
		en: 'Downloading… {{percent}}%',
		pt: 'A transferir… {{percent}}%',
	},
	multi_update_permission: {
		en: 'Android asks once: turn on “Allow from this source” for Gira+ Multi, then come back and tap Update.',
		pt: 'O Android pede uma vez: ative “Permitir desta origem” para o Gira+ Multi, volte e toque em Atualizar.',
	},
	multi_update_open_settings: {
		en: 'Open settings',
		pt: 'Abrir definições',
	},
	multi_update_failed: {
		en: "Couldn't download the update. Check the connection and try again.",
		pt: 'Não foi possível transferir a atualização. Verifique a ligação e tente de novo.',
	},
	multi_update_retry: {
		en: 'Try again',
		pt: 'Tentar de novo',
	},
} as const;