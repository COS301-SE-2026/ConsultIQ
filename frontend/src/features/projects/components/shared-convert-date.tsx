export  const convertDate = (dateReturned: string | undefined): string => {
    if (!dateReturned) return "No date specified";

    const parsedDate = new Date(dateReturned);
    if (!Number.isNaN(parsedDate.getTime())){
      const yyyy= parsedDate.getFullYear();
      const mm = String(parsedDate.getMonth() + 1).padStart(2, "0");
      const dd = String(parsedDate.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
    return "";
}