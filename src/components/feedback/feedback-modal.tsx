"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const t = useTranslations("feedback");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    feedbackType: "",
    subject: "",
    message: "",
  });

  const feedbackTypes = [
    { value: "bug_report", key: "bugReport" },
    { value: "feature_request", key: "featureRequest" },
    { value: "general_feedback", key: "generalFeedback" },
    { value: "praise", key: "praise" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.feedbackType || !formData.subject.trim() || !formData.message.trim()) {
      toast.error(t("validation.required"));
      return;
    }

    if (formData.subject.length > 200) {
      toast.error(t("validation.subjectTooLong"));
      return;
    }

    if (formData.message.length > 2000) {
      toast.error(t("validation.messageTooLong"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast.error(t("errors.rateLimited"));
        } else {
          toast.error(data.error || t("errors.submitFailed"));
        }
        return;
      }

      toast.success(t("success.submitted"));
      setFormData({ feedbackType: "", subject: "", message: "" });
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error(t("errors.networkError"));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedbackType">{t("form.type.label")}</Label>
            <Select
              value={formData.feedbackType}
              onValueChange={(value) => handleInputChange("feedbackType", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("form.type.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {feedbackTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {t(`form.type.options.${type.key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">{t("form.subject.label")}</Label>
            <Input
              id="subject"
              placeholder={t("form.subject.placeholder")}
              value={formData.subject}
              onChange={(e) => handleInputChange("subject", e.target.value)}
              maxLength={200}
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.subject.length}/200
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{t("form.message.label")}</Label>
            <Textarea
              id="message"
              placeholder={t("form.message.placeholder")}
              value={formData.message}
              onChange={(e) => handleInputChange("message", e.target.value)}
              maxLength={2000}
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.message.length}/2000
            </p>
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t("form.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  {t("form.submitting")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t("form.submit")}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}