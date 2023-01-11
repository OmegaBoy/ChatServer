CREATE TABLE [dbo].[ChatHistory](
	[userid] [varchar](512) NOT NULL,
	[message] [varchar](1048) NOT NULL,
	[username] [varchar](512) NOT NULL,
	[datetime] [datetime] NOT NULL,
	[room] [varchar](512) NOT NULL
) ON [PRIMARY]
GO