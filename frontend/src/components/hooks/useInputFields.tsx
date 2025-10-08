import { cn } from "@/components/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface InputField {
  type: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

export function useInputFields(inputMap: InputField[], isLoading: Boolean) {
  return (
    <div className="grid gap-1">
      {inputMap?.map(({ type, name, placeholder, value, onChange }, index) => {
        return (
          <div key={index}>
            <Label className="sr-only" htmlFor={name}>
              {name}
            </Label>
            {type === "select" ? (
              <Select onValueChange={onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a gender" value={value} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">
                    <span className="font-medium">Male</span>
                  </SelectItem>
                  <SelectItem value="female">
                    <span className="font-medium">Female</span>
                  </SelectItem>
                  <SelectItem value="others">
                    <span className="font-medium">Others</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : type === "date" ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !value && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value ? format(value, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={value}
                    onSelect={onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                id={name}
                placeholder={placeholder}
                type={type}
                autoCapitalize="none"
                autoComplete={name}
                autoCorrect="off"
                disabled={isLoading}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
