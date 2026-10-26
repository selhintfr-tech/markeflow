<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PasswordRecoveryCodeNotification extends Notification
{
    public function __construct(public readonly string $code) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your MarketFlow verification code')
            ->greeting('Password reset verification')
            ->line('Use this six-digit code to verify your email and reset your MarketFlow password:')
            ->line($this->code)
            ->line('This code expires in '.config('password-recovery.code_ttl_minutes', 10).' minutes and can be used only once.')
            ->line('If you did not request this code, you can ignore this email.');
    }
}
