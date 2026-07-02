interface PaginationProps {
  readonly currentPage: number;
  readonly onPageChange: (page:number) => void;
  readonly totalPages: number;
}

export function Pagination({currentPage,totalPages,onPageChange}: PaginationProps){
     if(totalPages <= 1) return null;

    return(
    <div className="flex justify-center items-center gap-6 mt-10 pb-8">
                <button
                  type="button"
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-5 py-2.5 rounded-lg border-2 border-solid font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}
                >
                  Previous
                </button>
                <span className="text-lg font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-5 py-2.5 rounded-lg border-2 border-solid font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}
                >
                  Next
                </button>
              </div>  
    );
 
}