<script lang="ts" module>
	// Gira+ Multi: the icons of the favourites. Home and Work are filled (their outline versions mark the empty slots);
	// named places use the outline icon the rider picked.
	import IconBallFootball from '@tabler/icons-svelte/icons/ball-football';
	import IconBarbell from '@tabler/icons-svelte/icons/barbell';
	import IconBriefcase2 from '@tabler/icons-svelte/icons/briefcase-2';
	import IconBriefcase2Filled from '@tabler/icons-svelte/icons/briefcase-2-filled';
	import IconCoffee from '@tabler/icons-svelte/icons/coffee';
	import IconFerry from '@tabler/icons-svelte/icons/ferry';
	import IconFirstAidKit from '@tabler/icons-svelte/icons/first-aid-kit';
	import IconGlassFull from '@tabler/icons-svelte/icons/glass-full';
	import IconHeart from '@tabler/icons-svelte/icons/heart';
	import IconHome from '@tabler/icons-svelte/icons/home';
	import IconHomeFilled from '@tabler/icons-svelte/icons/home-filled';
	import IconMapPin from '@tabler/icons-svelte/icons/map-pin';
	import IconSchool from '@tabler/icons-svelte/icons/school';
	import IconShoppingCart from '@tabler/icons-svelte/icons/shopping-cart';
	import IconToolsKitchen2 from '@tabler/icons-svelte/icons/tools-kitchen-2';
	import IconTrain from '@tabler/icons-svelte/icons/train';
	import IconTree from '@tabler/icons-svelte/icons/tree';
	import IconUsers from '@tabler/icons-svelte/icons/users';
	import type { PlaceIcon } from '$lib/favourites';

	export const PLACE_ICON_COMPONENTS: Record<PlaceIcon, typeof IconMapPin> = {
		'map-pin': IconMapPin,
		'heart': IconHeart,
		'users': IconUsers,
		'school': IconSchool,
		'barbell': IconBarbell,
		'coffee': IconCoffee,
		'tools-kitchen-2': IconToolsKitchen2,
		'shopping-cart': IconShoppingCart,
		'glass-full': IconGlassFull,
		'tree': IconTree,
		'ball-football': IconBallFootball,
		'first-aid-kit': IconFirstAidKit,
		'train': IconTrain,
		'ferry': IconFerry,
	};
	export const SLOT_ICONS = { home: IconHome, work: IconBriefcase2 };
	export const SLOT_ICONS_FILLED = { home: IconHomeFilled, work: IconBriefcase2Filled };
</script>

<script lang="ts">
	import { placeIcon, type Favourite } from '$lib/favourites';

	let { favourite, icon, size = 22, class: className = '' }: {
		/** A saved favourite; or `icon`, a place icon by name (the icon picker). */
		favourite?: Favourite,
		icon?: PlaceIcon,
		size?: number,
		class?: string,
	} = $props();

	const Component = $derived(favourite && favourite.kind !== 'other' ? SLOT_ICONS_FILLED[favourite.kind] :
		PLACE_ICON_COMPONENTS[icon ?? (favourite ? placeIcon(favourite) : 'map-pin')]);
</script>

<Component class={className} {size} stroke={2} />