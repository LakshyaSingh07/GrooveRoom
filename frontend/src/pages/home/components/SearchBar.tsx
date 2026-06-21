import { Input } from "@/components/ui/input";
import { useMusicStore } from "@/stores/useMusicStore";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

const SearchBar = () => {
	const { searchSongs, clearSearch } = useMusicStore();
	const [value, setValue] = useState("");

	// debounce: wait 300ms after the user stops typing before querying
	useEffect(() => {
		const trimmed = value.trim();

		if (!trimmed) {
			clearSearch();
			return;
		}

		const timeout = setTimeout(() => {
			searchSongs(trimmed);
		}, 300);

		return () => clearTimeout(timeout);
	}, [value, searchSongs, clearSearch]);

	return (
		<div className='relative mb-6 max-w-xl'>
			<Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400' />
			<Input
				value={value}
				onChange={(e) => setValue(e.target.value)}
				placeholder='Search songs or artists...'
				className='pl-9 pr-9 h-11 bg-zinc-800/60 border-zinc-700 focus-visible:ring-green-500'
			/>
			{value && (
				<button
					type='button'
					onClick={() => setValue("")}
					aria-label='Clear search'
					className='absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors'
				>
					<X className='size-4' />
				</button>
			)}
		</div>
	);
};
export default SearchBar;
