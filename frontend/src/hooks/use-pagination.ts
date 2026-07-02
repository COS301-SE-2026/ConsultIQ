import {useState, useMemo} from "react";

export function usePagination<T>(items: T[],itemsPerPage =5){
    const [currentPage,setCurrentPage] = useState(1);

      const totalPages= Math.ceil(items.length/itemsPerPage);
  const startIndex= (currentPage -1) * itemsPerPage;
  const currentItems = useMemo(() => items.slice(startIndex,startIndex+itemsPerPage),
    [items,startIndex,itemsPerPage]
  );

  return {currentPage,setCurrentPage,totalPages,currentItems};
}