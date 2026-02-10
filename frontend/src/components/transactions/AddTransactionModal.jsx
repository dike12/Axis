import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AddTransactionModal({ isOpen, onClose }) {
  const [date, setDate] = useState(new Date());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* CUSTOMIZATION: 
         bg-[#11141B] -> Matches your dashboard cards
         border-gray-800 -> Matches your borders
         text-white -> Forces dark mode text
      */}
      <DialogContent className="sm:max-w-106.25 bg-[#11141B] border-gray-800 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add Transaction</DialogTitle>
          <DialogDescription className="text-gray-400">
            Enter the details for your new transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          
          {/* 1. Type Selection */}
          <div className="space-y-2">
            <Label className="text-gray-300">Type</Label>
            <Select>
              <SelectTrigger className="bg-[#0B0E14] border-gray-800 focus:ring-emerald-500/20 text-white h-10">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-[#11141B] border-gray-800 text-white">
                <SelectItem value="income" className="focus:bg-emerald-500/20 focus:text-emerald-500 cursor-pointer">Income</SelectItem>
                <SelectItem value="expense" className="focus:bg-rose-500/20 focus:text-rose-500 cursor-pointer">Expense</SelectItem>
                <SelectItem value="investment" className="focus:bg-blue-500/20 focus:text-blue-500 cursor-pointer">Investment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 2. Date Picker (Interactive!) */}
          <div className="space-y-2 flex flex-col">
            <Label className="text-gray-300">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal bg-[#0B0E14] border-gray-800 hover:bg-[#1A1F26] hover:text-white h-10",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                  {date ? format(date, "PPP") : <span className="text-gray-500">Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[#11141B] border-gray-800" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className="bg-[#11141B] text-white rounded-md border-gray-800"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 3. Category */}
          <div className="space-y-2">
            <Label className="text-gray-300">Category</Label>
            <Select>
              <SelectTrigger className="bg-[#0B0E14] border-gray-800 text-white h-10">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-[#11141B] border-gray-800 text-white">
                <SelectItem value="salary" className="cursor-pointer hover:bg-emerald-500/20">Salary</SelectItem>
                <SelectItem value="food" className="cursor-pointer hover:bg-emerald-500/20">Food</SelectItem>
                <SelectItem value="shopping" className="cursor-pointer hover:bg-emerald-500/20">Shopping</SelectItem>
                <SelectItem value="utilities" className="cursor-pointer hover:bg-emerald-500/20">Utilities</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 4. Amount */}
          <div className="space-y-2">
            <Label className="text-gray-300">Amount</Label>
            <Input 
              type="number" 
              placeholder="0.00" 
              className="bg-[#0B0E14] border-gray-800 text-white placeholder:text-gray-600 focus-visible:ring-emerald-500/20 h-10" 
            />
          </div>

          {/* 5. Details */}
          <div className="space-y-2">
            <Label className="text-gray-300">Details</Label>
            <Input 
              placeholder="Description..." 
              className="bg-[#0B0E14] border-gray-800 text-white placeholder:text-gray-600 focus-visible:ring-emerald-500/20 h-10" 
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-gray-800 text-gray-300 hover:bg-gray-800/50 hover:text-white bg-transparent h-10"
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-600 text-white h-10 border-none"
          >
            Add Transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}