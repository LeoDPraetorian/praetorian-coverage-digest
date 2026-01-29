\AddToShipoutPictureBG{%
  \AtPageLowerLeft{%
    \put(0,0){%
      \rotatebox{90}{%
        \raisebox{\paperwidth}{%
          \parbox{8in}{%
            \raggedright
            \centering
            \color{PraetorianPurple}
             Privileged and Confidential; Prepared at the Direction of Counsel.
          }%
        }%
      }%
    }%
  }%
}

\lofoot*{\color{PraetorianPurple}\footnotesize\textbf{Privileged and Confidential; Prepared at the Direction of Counsel}}

\phantomsection

### Preliminary Observation: Insufficient Trigger Validation Enables Targeted Phishing Attacks

\phantomsection

#### Preliminary Observation

The notification trigger functionality lacked server-side authorization controls to verify that the requesting user was permitted to send notifications to other users. While the application's interface indicated that notifications could only be sent to the authenticated user's associated email address, the API did not enforce this restriction.

By modifying the `id` and `username` parameters in the trigger creation request, an attacker could cause the system to deliver notification emails to arbitrary users. The application did not validate that the target user matched the authenticated session, allowing any authenticated user to send application-generated emails to other platform users.

This finding is related to the Username and UUID Enumeration finding, which provided the values necessary to target specific victims. When combined with the Subdomain Takeover finding, an attacker could craft notification content pointing to attacker-controlled infrastructure that impersonates the legitimate application, enabling credential harvesting at scale.

#### Potential Impact

An attacker could leverage this finding to send phishing emails to arbitrary platform users from a trusted application domain. Because these emails originate from legitimate application infrastructure, they are more likely to bypass spam filters and appear trustworthy to recipients.

If combined with the Subdomain Takeover finding, an attacker could direct victims to a credential harvesting page hosted on application-owned infrastructure. This attack could be executed at scale, as the enumeration finding provides the necessary identifiers to target any user.

Compromised accounts would grant the attacker access to the victim's data, which may include proprietary materials. Additionally, an attacker could craft pretexts to solicit payment information from victims, such as prompts to enter payment details to claim a promotional gift card.

The combination of trusted email origin, legitimate destination URLs, and the ability to target users at scale creates conditions favorable for a broad credential harvesting campaign.

#### Endpoint Impacted

- `PUT /api/v1/actions/{id}`

#### Verification and Attack Information
Praetorian discovered this finding while testing the notification trigger functionality. The application's user interface displayed a message indicating that notifications could only be sent to the authenticated user's associated email address.

\FigureInPlace[The application indicated that trigger notifications could only be sent to the authenticated user's email address.][center]{$report_path$/phases/web/images/error.png}

Praetorian intercepted the trigger creation request and modified the `id` and `username` parameters to reference a victim user's values. Additionally, Praetorian crafted a phishing pretext by modifying the email subject and body content to entice the victim to click the malicious link.

\FigureInPlace[Praetorian modified the trigger creation request to target a victim user.][center]{$report_path$/phases/web/images/trigger.png}

The application accepted the request and confirmed the trigger creation in the GUI.

\FigureInPlace[The application confirmed the malicious trigger configuration.][center]{$report_path$/phases/web/images/confirmed.png}

After triggering the notification, the victim received an email from the legitimate {{target}} domain containing the attacker-crafted phishing content.

\FigureInPlace[The victim received a notification email containing attacker-controlled content.][center]{$report_path$/phases/web/images/email.png}

The victim clicked the link and was directed to a credential harvesting page hosted on the {{target}} subdomain identified in the Subdomain Takeover finding.

\FigureInPlace[The victim was directed to a phishing page hosted on {{target}} infrastructure.][center]{$report_path$/phases/web/images/phish.png}

After submitting credentials, the victim was redirected to the legitimate {{target}} page, making the attack less likely to be detected. Additionally, Praetorian confirmed receipt of the victim's credentials on a Burp Collaborator server.

\FigureInPlace[Praetorian received the victim's credentials on a Burp Collaborator server.][center]{$report_path$/phases/web/images/creds.png}

#### Areas for Improvement
Praetorian suggests {{client_short}} consider implementing server-side validation to verify that the authenticated user is authorized to create notification triggers for the specified target user. The API should reject requests where the `id` or `username` parameters reference a user other than the authenticated session owner.

Additionally, Praetorian suggests {{client_short}} consider restricting user-controlled input in notification email content. Allowing arbitrary text in the subject and body fields enabled the crafting of convincing phishing pretexts. Limiting customization options or implementing content filtering may reduce the likelihood of abuse.

#### References
[OWASP: Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) \
