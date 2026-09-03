import React, { useEffect } from 'react';
import { Box, Container, Typography, Paper, Divider, IconButton, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft as ChevronLeftIcon } from '@mui/icons-material';

const PrivacyPolicyPage: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <Box sx={{ bgcolor: '#f8f9fa', minHeight: '100vh', py: 8 }}>
            <Container maxWidth="md">
                <IconButton
                    onClick={() => navigate(-1)}
                    sx={{
                        mb: 2,
                        bgcolor: 'white',
                        border: '1px solid rgba(0,0,0,0.08)',
                        '&:hover': {
                            bgcolor: 'primary.main',
                            color: 'white',
                        }
                    }}
                >
                    <ChevronLeftIcon />
                </IconButton>

                <Paper elevation={0} sx={{ p: { xs: 4, md: 8 }, borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }}>
                    <Typography variant="h3" component="h1" fontWeight="800" color="primary" gutterBottom>
                        Privacy Policy
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                        Last updated: April 21, 2026
                    </Typography>

                    <Divider sx={{ my: 4 }} />

                    <Box sx={{ '& > p': { mb: 2, lineHeight: 1.7, color: 'text.secondary' }, '& > h2': { mt: 6, mb: 3, fontWeight: 700 }, '& > h3': { mt: 4, mb: 2, fontWeight: 600 } }}>
                        <Typography variant="body1">
                            This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.
                        </Typography>

                        <Typography variant="body1">
                            We use Your Personal Data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.
                        </Typography>

                        <Typography variant="h5" component="h2">Interpretation and Definitions</Typography>
                        <Typography variant="h6" component="h3">Interpretation</Typography>
                        <Typography variant="body1">
                            The words whose initial letters are capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.
                        </Typography>

                        <Typography variant="h6" component="h3">Definitions</Typography>
                        <Typography variant="body1">
                            For the purposes of this Privacy Policy:
                        </Typography>
                        <Box component="ul" sx={{ color: 'text.secondary', pl: 3, mb: 2 }}>
                            <Box component="li" sx={{ mb: 1 }}><strong>Account</strong> means a unique account created for You to access our Service or parts of our Service.</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>Affiliate</strong> means an entity that controls, is controlled by, or is under common control with a party, where "control" means ownership of 50% or more of the shares, equity interest or other securities entitled to vote for election of directors or other managing authority.</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>Application</strong> refers to Suthra One, the software program provided by the Company.</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>Company</strong> (referred to as either "the Company", "We", "Us" or "Our" in this Privacy Policy) refers to Suthra One.</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>Country</strong> refers to: Florida, United States</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>Device</strong> means any device that can access the Service such as a computer, a cell phone or a digital tablet.</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>Personal Data</strong> (or "Personal Information") is any information that relates to an identified or identifiable individual.</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>Service</strong> refers to the Application.</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>Service Provider</strong> means any natural or legal person who processes the data on behalf of the Company. It refers to third-party companies or individuals employed by the Company to facilitate the Service, to provide the Service on behalf of the Company, to perform services related to the Service or to assist the Company in analyzing how the Service is used.</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>Usage Data</strong> refers to data collected automatically, either generated by the use of the Service or from the Service infrastructure itself (for example, the duration of a page visit).</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>You</strong> means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</Box>
                        </Box>

                        <Typography variant="h5" component="h2">Collecting and Using Your Personal Data</Typography>
                        <Typography variant="h6" component="h3">Types of Data Collected</Typography>
                        <Typography variant="h6" component="h4" sx={{ mt: 3, fontWeight: 600 }}>Personal Data</Typography>
                        <Typography variant="body1">
                            While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You. Personally identifiable information may include, but is not limited to:
                        </Typography>
                        <Box component="ul" sx={{ color: 'text.secondary', pl: 3, mb: 2 }}>
                            <Box component="li">Email address</Box>
                            <Box component="li">First name and last name</Box>
                            <Box component="li">Phone number</Box>
                            <Box component="li">Address, State, Province, ZIP/Postal code, City</Box>
                        </Box>

                        <Typography variant="h6" component="h4" sx={{ mt: 3, fontWeight: 600 }}>Usage Data</Typography>
                        <Typography variant="body1">
                            Usage Data is collected automatically when using the Service.
                        </Typography>
                        <Typography variant="body1">
                            Usage Data may include information such as Your Device's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that You visit, the time and date of Your visit, the time spent on those pages, unique device identifiers and other diagnostic data.
                        </Typography>
                        <Typography variant="body1">
                            When You access the Service by or through a mobile device, We may collect certain information automatically, including, but not limited to, the type of mobile device You use, Your mobile device's unique ID, the IP address of Your mobile device, Your mobile operating system, the type of mobile Internet browser You use, unique device identifiers and other diagnostic data.
                        </Typography>

                        <Typography variant="h5" component="h2">Use of Your Personal Data</Typography>
                        <Typography variant="body1">
                            The Company may use Personal Data for the following purposes:
                        </Typography>
                        <Box component="ul" sx={{ color: 'text.secondary', pl: 3, mb: 2 }}>
                            <Box component="li" sx={{ mb: 1 }}><strong>To provide and maintain our Service</strong>, including to monitor the usage of our Service.</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>To manage Your Account:</strong> to manage Your registration as a user of the Service.</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>For the performance of a contract:</strong> the development, compliance and undertaking of the purchase contract for the products, items or services You have purchased.</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>To contact You:</strong> To contact You by email, telephone calls, SMS, or other equivalent forms of electronic communication.</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>To provide You with news</strong>, special offers, and general information about other goods, services and events.</Box>
                            <Box component="li" sx={{ mb: 1 }}><strong>To manage Your requests:</strong> To attend and manage Your requests to Us.</Box>
                        </Box>

                        <Typography variant="h5" component="h2">Retention of Your Personal Data</Typography>
                        <Typography variant="body1">
                            The Company will retain Your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use Your Personal Data to the extent necessary to comply with our legal obligations, resolve disputes, and enforce our legal agreements and policies.
                        </Typography>

                        <Typography variant="h5" component="h2">Transfer of Your Personal Data</Typography>
                        <Typography variant="body1">
                            Your information, including Personal Data, is processed at the Company's operating offices and in any other places where the parties involved in the processing are located. It means that this information may be transferred to — and maintained on — computers located outside of Your state, province, country or other governmental jurisdiction where the data protection laws may differ from those from Your jurisdiction.
                        </Typography>

                        <Typography variant="h5" component="h2">Delete Your Personal Data</Typography>
                        <Typography variant="body1">
                            You have the right to delete or request that We assist in deleting the Personal Data that We have collected about You.
                        </Typography>

                        <Typography variant="h5" component="h2">Disclosure of Your Personal Data</Typography>
                        <Typography variant="h6" component="h3">Business Transactions</Typography>
                        <Typography variant="body1">
                            If the Company is involved in a merger, acquisition or asset sale, Your Personal Data may be transferred.
                        </Typography>

                        <Typography variant="h6" component="h3">Law enforcement</Typography>
                        <Typography variant="body1">
                            Under certain circumstances, the Company may be required to disclose Your Personal Data if required to do so by law or in response to valid requests by public authorities.
                        </Typography>

                        <Typography variant="h5" component="h2">Security of Your Personal Data</Typography>
                        <Typography variant="body1">
                            The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure.
                        </Typography>

                        <Typography variant="h5" component="h2">Children's Privacy</Typography>
                        <Typography variant="body1">
                            Our Service does not address anyone under the age of 16. We do not knowingly collect personally identifiable information from anyone under the age of 16.
                        </Typography>

                        <Typography variant="h5" component="h2">Changes to this Privacy Policy</Typography>
                        <Typography variant="body1">
                            We may update Our Privacy Policy from time to time. We will notify You of any changes by posting the new Privacy Policy on this page.
                        </Typography>

                        <Typography variant="h5" component="h2">Contact Us</Typography>
                        <Typography variant="body1">
                            If you have any questions about this Privacy Policy, You can contact us:
                        </Typography>
                        <Box component="ul" sx={{ color: 'text.secondary', pl: 3, mb: 2 }}>
                            <Box component="li">By email: contact@suthraone.com</Box>
                            <Box component="li">By visiting this page on our website: <Link href="https://suthraone.com/" target="_blank" rel="noopener">https://suthraone.com/</Link></Box>
                        </Box>
                    </Box>
                </Paper>

            </Container>
        </Box>
    );
};

export default PrivacyPolicyPage;
