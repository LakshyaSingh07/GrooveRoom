import { useMusicStore } from "@/stores/useMusicStore";
import { Search } from "lucide-react";
import SectionGridSkeleton from "./SectionGridSkeleton";
import SongCard from "./SongCard";

const SearchResults = () => {
	const { searchResults, isSearching, searchQuery } = useMusicStore();

	return (
		<div className='mb-8'>
			<h2 className='text-xl sm:text-2xl font-bold mb-4'>
				Results for <span className='text-green-400'>"{searchQuery}"</span>
			</h2>

			{isSearching ? (
				<SectionGridSkeleton />
			) : searchResults.length === 0 ? (
				<div className='flex flex-col items-center justify-center py-16 text-zinc-400'>
					<Search className='size-10 mb-3' />
					<p className='text-lg font-medium'>No songs found</p>
					<p className='text-sm'>Try a different title or artist.</p>
				</div>
			) : (
				<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
					{searchResults.map((song) => (
						<SongCard key={song._id} song={song} />
					))}
				</div>
			)}
		</div>
	);
};
export default SearchResults;
