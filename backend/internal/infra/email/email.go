package email

type Client interface {
	SendMail(mail *Mail) error
	SendMails(mails ...*Mail) error
}

type Mail struct {
	Recipients  MailRecipients
	Content     MailContent
	Attachments []MailAttachment
}

type MailRecipients struct {
	To  []MailAddress `json:"to"`
	Cc  []MailAddress `json:"cc"`
	Bcc []MailAddress `json:"bcc"`
}

type MailAddress struct {
	Address     string `json:"address"`
	DisplayName string `json:"displayName"`
}

type MailContent struct {
	Subject   string `json:"subject"`
	PlainText string `json:"plainText"`
	Html      string `json:"html"`
}

type MailAttachment struct {
	Name          string `json:"name"`
	Base64Content string `json:"contentInBase64"`
	ContentType   string `json:"contentType"`
}
