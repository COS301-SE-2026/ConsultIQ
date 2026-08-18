import { toast } from "sonner";
import type { ParsedAddress } from "../lib/search-address";
import { searchAddress, parseGoogleAddress } from "../lib/search-address";
import { useState, useRef, useCallback, useEffect } from "react";


interface UseAddressSearchOptions {
    onSelect: (parsed: ParsedAddress) => void;
    debounceTime?: number;
    minLength?: number;
}

export function useAddressSearch({ onSelect, debounceTime = 500, minLength = 3 }: UseAddressSearchOptions) {
    const [addressSearch, setAddressSearch] = useState("");
    const [locationResults, setLocationResults] = useState<ParsedAddress | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isAddressLoading, setIsAddressLoading] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchIdRef = useRef(0);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const runAddressSearch = useCallback(async (query: string) => {
        const requestId = ++searchIdRef.current;
        try {
            setIsAddressLoading(true);
            const data = await searchAddress(query);

            if (requestId !== searchIdRef.current) return;

            if (!data || !data.addressComponents) {
                setLocationResults(null);
                setShowDropdown(false);
                return;
            }

            const parsedAddress = await parseGoogleAddress(data.addressComponents);
            if (requestId !== searchIdRef.current) return;

            setLocationResults(parsedAddress);
            setShowDropdown(!!parsedAddress);

        } catch (error) {
            if (requestId === searchIdRef.current) {
                toast.error(error instanceof Error ? error.message : "Failed to search address");
                setLocationResults(null);
                setShowDropdown(false);
            }

        } finally {
            if (requestId === searchIdRef.current) setIsAddressLoading(false);
        }
    }, []);


    const handleSearchAddress = useCallback((query: string) => {
        setAddressSearch(query);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!query.trim() || query.trim().length < minLength) {
            setLocationResults(null);
            setShowDropdown(false);
            return;
        }

        debounceRef.current = setTimeout(() => runAddressSearch(query),debounceTime);

    },[minLength,debounceTime,runAddressSearch]);


    
    const handleSelectAddress = useCallback(() => {
        if (!locationResults) return;

        onSelect(locationResults);


        setAddressSearch([locationResults.addressLine1, locationResults.city].filter(Boolean).join(", "));
        setShowDropdown(false);

    }, [locationResults, onSelect]);

    return {
        addressSearch,
        locationResults,
        isAddressLoading,
        showDropdown,
        handleSearchAddress,
        handleSelectAddress,
    };


}
