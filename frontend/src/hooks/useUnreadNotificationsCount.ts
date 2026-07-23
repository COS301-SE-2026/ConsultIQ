import {useState, useEffect, useCallback} from "react";
import { useAuth } from "./useAuth";
import { getNotifications } from "../features/notifications/services/notification.services";
import { toast } from "sonner";

export default function useUnreadNotificationCount(){
    const {user} = useAuth();
    const [count, setCount] = useState(0);

    const refresh = useCallback(async () => {
        if(!user){
            return;
        }

        try {
            const res = await getNotifications();
            setCount(res.filter(n=> !n.isRead).length);
        } catch (err) {
            toast.error(err instanceof Error ? err.message :"Failed to get notification count");
        }
    },[user]);

    useEffect(() => {
        if(user){
            // eslint-disable-next-line react-hooks/set-state-in-effect
            refresh();
        }
        
    },[user,refresh]);
    return {count: user ? count :0 , refresh};
}
