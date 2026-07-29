import DatePicker from "react-datepicker";

interface DateFieldProps{
    readonly id:string;
    readonly label:string;
    readonly selected: Date |null;
    readonly onChange: (date: Date |null) => void;
    readonly error?: string;
}

function DateField({id,label,selected,onChange,error}:DateFieldProps){
    return(
        <div className="flex flex-col gap-1">
            <label htmlFor={id}>{label}</label>
                <DatePicker
                    selected={selected} 
                     onChange={onChange}
                     dateFormat={"dd/MM/yyyy"}
                     placeholderText="DD/MM/YYYY"
                     maxDate={new Date()}
                     showMonthDropdown
                     showYearDropdown
                     scrollableYearDropdown
                     scrollableMonthYearDropdown
                     yearDropdownItemNumber={100}
                     className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#002D72]/20"
                    
                    />
                    {error && <span className="text-red-500 text-sm">{error}</span>}
         </div>
    );
}

export default DateField;