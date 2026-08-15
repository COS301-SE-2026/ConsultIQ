import { Button } from "../../../../components/ui/button";
import { Pencil } from "lucide-react";

interface EditControlProps{
    readonly isEditing: boolean;
    readonly isSaving: boolean;
    readonly onEdit: () => void;
    readonly onSave: () => void;
    readonly onCancel: () => void;

}

const buttonStyle = {
     fontSize: "14px",
     padding: "6px 12px",
     boxShadow: "2px 4px 6px rgba(211,211,211,0.8)",

};

function EditControls({isEditing, isSaving, onEdit,onSave,onCancel}: EditControlProps){
    return(
         <div className = " flex-1 flex justify-end gap-2">
           {isEditing ?(
              <>
            <Button 
              onClick={onSave} 
              variant="default" 
              className ="font-bold px-4 py-2"
              style={buttonStyle}
              disabled={isSaving} 
            >
              Save
            </Button>
            <Button 
              onClick={onCancel} 
              variant="ghost" 
              className="font-bold px-4 py-2"
              style ={buttonStyle}
              disabled={isSaving} 
            >
              Cancel
            </Button>

            </>
           ):(
            <Button 
              onClick={onEdit} 
              variant="ghost" 
              className="gap-2 font-bold px-4 py-2 shadow-sm"
              style ={buttonStyle}
             >
                <Pencil size={16}/>
                Edit
             </Button>
           
           )}
          </div>
    );
}

export default EditControls;