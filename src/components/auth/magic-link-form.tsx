// "use client";

// import { useState, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Mail, Loader2, Check, Clock } from "lucide-react";
// import { useTranslations } from "next-intl";
// import { toast } from "sonner";
// import { rateLimitManager } from "@/lib/rate-limit-utils";

// interface MagicLinkFormProps {
//   className?: string;
//   redirectPath?: string | null;
//   locale?: string | null;
// }

// export function MagicLinkForm({
//   className,
//   redirectPath,
//   locale,
// }: MagicLinkFormProps) {
//   // TODO: Re-enable when Neon Auth ships webhook support for custom email templates
//   // const { signInWithMagicLink } = useAuth()
//   // const _auth = useAuth() // keep hook call to avoid conditional hook issues
//   // const signInWithMagicLink = async (_email: string, _opts?: { redirectPath?: string | null; locale?: string | null }): Promise<{ error?: string }> => {
//   // return { error: 'Magic link sign-in is temporarily disabled' }
//   // }
//   const [email, setEmail] = useState("");
//   const [isLoading, setIsLoading] = useState(false);
//   const [isSuccess, setIsSuccess] = useState(false);
//   const [rateLimitInfo, setRateLimitInfo] = useState({
//     isRateLimited: false,
//     waitTimeText: "",
//     resetTime: 0,
//   });
//   const t = useTranslations("auth");

//   const isValidEmail = (email: string) => {
//     return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
//   };

//   // Check for existing rate limits on component mount
//   useEffect(() => {
//     const currentRateLimit = rateLimitManager.getRemainingWaitTime();
//     if (currentRateLimit.isRateLimited) {
//       setRateLimitInfo({
//         isRateLimited: true,
//         waitTimeText: currentRateLimit.waitTimeText,
//         resetTime: currentRateLimit.resetTime,
//       });
//     }
//   }, []);

//   // Countdown timer effect
//   useEffect(() => {
//     if (!rateLimitInfo.isRateLimited) return;

//     const interval = setInterval(() => {
//       const remaining = rateLimitManager.getRemainingWaitTime();
//       if (!remaining.isRateLimited) {
//         setRateLimitInfo({
//           isRateLimited: false,
//           waitTimeText: "",
//           resetTime: 0,
//         });
//       } else {
//         setRateLimitInfo({
//           isRateLimited: true,
//           waitTimeText: remaining.waitTimeText,
//           resetTime: remaining.resetTime,
//         });
//       }
//     }, 1000);

//     return () => clearInterval(interval);
//   }, [rateLimitInfo.isRateLimited]);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();

//     if (!email.trim()) {
//       toast.error(t("emailRequired"));
//       return;
//     }

//     if (!isValidEmail(email)) {
//       toast.error(t("invalidEmail"));
//       return;
//     }

//     if (rateLimitInfo.isRateLimited) {
//       toast.error(
//         `${t("pleaseWaitBeforeRetrying")} (${rateLimitInfo.waitTimeText})`,
//       );
//       return;
//     }

//     setIsLoading(true);
//     setIsSuccess(false);

//     try {
//       const result = await signInWithMagicLink(email.trim(), {
//         redirectPath,
//         locale,
//       });

//       if (result.error) {
//         const rateLimitResult = rateLimitManager.analyzeRateLimit({
//           message: result.error,
//         });

//         if (rateLimitResult.isRateLimited) {
//           setRateLimitInfo({
//             isRateLimited: true,
//             waitTimeText: rateLimitResult.waitTimeText,
//             resetTime: rateLimitResult.resetTime,
//           });
//           toast.error(
//             `${t("tooManyRequests")} Please wait ${rateLimitResult.waitTimeText}.`,
//           );
//         } else {
//           toast.error(result.error || t("failedToSendMagicLink"));
//         }
//       } else {
//         // Clear any existing rate limit on successful send
//         rateLimitManager.clearRateLimit();
//         setRateLimitInfo({
//           isRateLimited: false,
//           waitTimeText: "",
//           resetTime: 0,
//         });
//         setIsSuccess(true);
//         setEmail("");
//         toast.success(t("emailSent"));
//       }
//     } catch (err) {
//       console.error("Magic link request error:", err);

//       if (err instanceof Error) {
//         const rateLimitResult = rateLimitManager.analyzeRateLimit(err);

//         if (rateLimitResult.isRateLimited) {
//           setRateLimitInfo({
//             isRateLimited: true,
//             waitTimeText: rateLimitResult.waitTimeText,
//             resetTime: rateLimitResult.resetTime,
//           });
//           toast.error(
//             `${t("tooManyRequests")} Please wait ${rateLimitResult.waitTimeText}.`,
//           );
//         } else {
//           toast.error(err.message);
//         }
//       } else {
//         toast.error(t("unexpectedError"));
//       }
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   if (isSuccess) {
//     return (
//       <div
//         className={`flex flex-col items-center space-y-4 max-w-sm mx-auto ${className}`}
//       >
//         <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
//           <Check className="w-8 h-8 text-green-600" />
//         </div>
//         <div className="text-center">
//           <h3 className="text-lg font-medium text-foreground mb-2">
//             {t("emailSent")}
//           </h3>
//           <p className="text-muted-foreground text-sm">
//             {t("emailSentDescription")}
//           </p>
//         </div>
//         <Button
//           type="button"
//           variant="outline"
//           onClick={() => {
//             setIsSuccess(false);
//             setEmail("");
//             // Check if we're still rate limited when going back
//             const currentRateLimit = rateLimitManager.getRemainingWaitTime();
//             if (currentRateLimit.isRateLimited) {
//               setRateLimitInfo({
//                 isRateLimited: true,
//                 waitTimeText: currentRateLimit.waitTimeText,
//                 resetTime: currentRateLimit.resetTime,
//               });
//             }
//           }}
//         >
//           {t("sendAnotherEmail")}
//         </Button>
//       </div>
//     );
//   }

//   return (
//     <form
//       onSubmit={handleSubmit}
//       className={`space-y-4 max-w-sm mx-auto ${className}`}
//     >
//       <div className="space-y-2">
//         <div className="relative">
//           <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
//           <Input
//             type="email"
//             placeholder={t("emailPlaceholder")}
//             value={email}
//             onChange={(e) => {
//               setEmail(e.target.value);
//             }}
//             disabled={isLoading || rateLimitInfo.isRateLimited}
//             className="pl-10"
//             autoComplete="email"
//           />
//         </div>
//       </div>

//       <Button
//         type="submit"
//         disabled={
//           isLoading ||
//           rateLimitInfo.isRateLimited ||
//           !email.trim() ||
//           !isValidEmail(email)
//         }
//         className="w-full"
//       >
//         {isLoading ? (
//           <>
//             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//             {t("sendingMagicLink")}
//           </>
//         ) : (
//           <>
//             <Mail className="mr-2 h-4 w-4" />
//             {t("sendMagicLink")}
//           </>
//         )}
//       </Button>

//       <div className="text-xs text-muted-foreground text-center">
//         <p>{t("magicLinkInfo")}</p>
//         {rateLimitInfo.isRateLimited && (
//           <div className="text-destructive mt-1 space-y-1">
//             <div className="flex items-center justify-center gap-1">
//               <Clock className="h-3 w-3" />
//               <p className="text-xs">
//                 {t("rateLimitMessage")}: {rateLimitInfo.waitTimeText}
//               </p>
//             </div>
//           </div>
//         )}
//       </div>
//     </form>
//   );
// }
